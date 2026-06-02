// Cron-driven edge function: sends push notifications for
//   - Family meeting reminders (24h before)
//   - Attendance check-in deadline reminders (1h before)
//
// Respects each user's notification_preferences (push_enabled +
// meeting_reminders / attendance_deadlines), and uses push_notification_log
// to guarantee at-most-once delivery per meeting + type per user.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FIREBASE_SERVICE_ACCOUNT = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

async function sendSms(to: string, message: string): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) return false;
  try {
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const r = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: to, From: TWILIO_PHONE_NUMBER, Body: message }).toString(),
    });
    return r.ok;
  } catch (e) {
    console.warn("[sms] failed", e);
    return false;
  }
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }
  const pem = sa.private_key.replace(/\\n/g, "\n");
  const body = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const keyBuf = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyBuf,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const jwt = await create(
    { alg: "RS256", typ: "JWT" },
    {
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: getNumericDate(0),
      exp: getNumericDate(3600),
    },
    key
  );
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!r.ok) throw new Error(`oauth2 token failed: ${r.status}`);
  const j = await r.json();
  cachedAccessToken = { token: j.access_token, expiresAt: Date.now() + j.expires_in * 1000 };
  return cachedAccessToken.token;
}

async function sendFcm(
  sa: ServiceAccount,
  token: string,
  title: string,
  body: string,
  data: Record<string, string>
): Promise<number> {
  const access = await getAccessToken(sa);
  const r = await fetch(
    `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          data,
          webpush: data.url ? { fcm_options: { link: data.url } } : undefined,
        },
      }),
    }
  );
  return r.status;
}

interface MeetingRow {
  id: string;
  family_id: string;
  meeting_date: string;
  meeting_time: string | null;
  location: string | null;
  families: { name: string; slug: string } | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!FIREBASE_SERVICE_ACCOUNT) {
      return new Response(
        JSON.stringify({ error: "FIREBASE_SERVICE_ACCOUNT not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const sa: ServiceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const now = new Date();

    // 1) Meetings happening in the next ~25h (reminder_1d window)
    //    and the next ~75min (attendance deadline window).
    const in25h = new Date(now.getTime() + 25 * 3600 * 1000);
    const fromDate = now.toISOString().slice(0, 10);
    const toDate = in25h.toISOString().slice(0, 10);

    const { data: meetings, error: mErr } = await admin
      .from("meetings")
      .select("id, family_id, meeting_date, meeting_time, location, families(name, slug)")
      .gte("meeting_date", fromDate)
      .lte("meeting_date", toDate)
      .returns<MeetingRow[]>();

    if (mErr) throw mErr;

    let pushedReminder = 0;
    let pushedDeadline = 0;
    let skipped = 0;
    let failed = 0;

    for (const m of meetings ?? []) {
      const start = new Date(
        `${m.meeting_date}T${m.meeting_time ?? "13:00:00"}`
      );
      const msUntil = start.getTime() - now.getTime();
      const hoursUntil = msUntil / 3600_000;

      // Determine which notifications apply right now
      const send24h = hoursUntil > 22 && hoursUntil <= 25; // reminder_1d
      const send1h = hoursUntil > 0 && hoursUntil <= 1.25; // attendance deadline
      if (!send24h && !send1h) {
        skipped++;
        continue;
      }

      // Fetch family members for this family
      const { data: fm } = await admin
        .from("family_members")
        .select("user_id")
        .eq("family_id", m.family_id);
        .from("family_members")
        .select("user_id")
        .eq("family_id", m.family_id);

      const userIds = (fm ?? []).map((r) => r.user_id);
      if (userIds.length === 0) {
        skipped++;
        continue;
      }

      const { data: profiles } = await admin
        .from("profiles")
        .select("id, push_token, phone")
        .in("id", userIds);

      const { data: prefs } = await admin
        .from("notification_preferences")
        .select("user_id, push_enabled, sms_enabled, meeting_reminders, attendance_deadlines")
        .in("user_id", userIds)
        .is("family_id", null);

      const prefMap = new Map(
        (prefs ?? []).map((p) => [p.user_id, p])
      );

      const familyName = m.families?.name ?? "Family";
      const url = m.families?.slug
        ? `/family/${m.families.slug}/meetings/${m.id}`
        : `/meetings/${m.id}`;

      const meetingTimeStr =
        (m.meeting_time ?? "13:00").slice(0, 5);

      type Job = {
        userId: string;
        token: string | null;
        phone: string | null;
        smsEnabled: boolean;
        type: "meeting_reminder_1d" | "attendance_deadline";
        title: string;
        body: string;
        critical: boolean;
      };
      const jobs: Job[] = [];

      for (const p of profiles ?? []) {
        const pref = prefMap.get(p.id);
        const pushOn = pref?.push_enabled ?? true;
        const smsOn = pref?.sms_enabled ?? false;

        // Skip if user opted out of both channels
        if (!pushOn && !smsOn) continue;

        if (send24h && (pref?.meeting_reminders ?? true)) {
          jobs.push({
            userId: p.id,
            token: pushOn ? p.push_token : null,
            phone: p.phone,
            smsEnabled: smsOn,
            type: "meeting_reminder_1d",
            title: `📅 ${familyName} meeting tomorrow`,
            body: `${m.meeting_date} at ${meetingTimeStr}${m.location ? ` — ${m.location}` : ""}`,
            critical: false,
          });
        }
        if (send1h && (pref?.attendance_deadlines ?? true)) {
          jobs.push({
            userId: p.id,
            token: pushOn ? p.push_token : null,
            phone: p.phone,
            smsEnabled: smsOn,
            type: "attendance_deadline",
            title: `⏰ Check in for ${familyName}`,
            body: `Meeting starts in under an hour. Check in to be marked present.`,
            critical: true,
          });
        }
      }

      // De-dup against push_notification_log, then send
      for (const job of jobs) {
        const { data: existing } = await admin
          .from("push_notification_log")
          .select("id")
          .eq("user_id", job.userId)
          .eq("notification_type", job.type)
          .eq("reference_id", m.id)
          .maybeSingle();
        if (existing) continue;

        let delivered = false;
        let status = 0;
        try {
          if (job.token) {
            status = await sendFcm(sa, job.token, job.title, job.body, {
              url,
              meeting_id: m.id,
              type: job.type,
            });
            if (status >= 200 && status < 300) delivered = true;
          }

          // SMS fallback for critical reminders when push didn't deliver
          if (!delivered && job.critical && job.smsEnabled && job.phone) {
            const smsOk = await sendSms(job.phone, `${job.title}\n${job.body}`);
            if (smsOk) {
              delivered = true;
              status = 200;
            }
          }

          // Inbox row regardless of channel
          await admin.from("in_app_notifications").insert({
            user_id: job.userId,
            family_id: m.family_id,
            title: job.title,
            body: job.body,
            notification_type: job.type,
            reference_table: "meetings",
            reference_id: m.id,
            link: url,
            channels: [job.token ? "push" : null, job.smsEnabled && !delivered ? null : (job.smsEnabled && job.critical ? "sms" : null), "inapp"].filter(Boolean),
          });

          await admin.from("push_notification_log").insert({
            user_id: job.userId,
            family_id: m.family_id,
            notification_type: job.type,
            reference_id: m.id,
            fcm_status: status,
          });
          if (delivered) {
            if (job.type === "meeting_reminder_1d") pushedReminder++;
            else pushedDeadline++;
          } else {
            failed++;
          }
        } catch (e) {
          console.error("[meeting-push] send failed", e);
          failed++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        meetings_scanned: meetings?.length ?? 0,
        pushed_meeting_reminders: pushedReminder,
        pushed_attendance_deadlines: pushedDeadline,
        meetings_skipped: skipped,
        failed,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[send-meeting-push-reminders] error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

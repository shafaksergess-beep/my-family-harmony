// Realtime dispatcher invoked by Postgres triggers via pg_net.
// Fans an event out to:
//   1. in_app_notifications inbox rows (per recipient)
//   2. Firebase Cloud Messaging push (when user has push_token + push_enabled)
//   3. Twilio SMS fallback for critical events when push disabled/missing
//
// Authentication: requires x-cron-secret header (matches private.cron_config).

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FIREBASE_SERVICE_ACCOUNT = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

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

async function sendFcm(sa: ServiceAccount, token: string, title: string, body: string, data: Record<string, string>) {
  const access = await getAccessToken(sa);
  const r = await fetch(
    `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
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

async function sendSms(to: string, message: string): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) return false;
  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const form = new URLSearchParams({ To: to, From: TWILIO_PHONE_NUMBER, Body: message });
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  if (!r.ok) console.warn("[sms] failed", r.status, await r.text());
  return r.ok;
}

interface Payload {
  event: string;
  table: string;
  record_id: string;
  family_id?: string | null;
  member_id?: string | null;
  [k: string]: unknown;
}

interface BuiltMessage {
  title: string;
  body: string;
  link: string;
  prefField: keyof PrefRow; // which user preference to check
  recipients: "family" | "leaders" | "member"; // who gets it
  critical: boolean; // SMS fallback eligible
}

interface PrefRow {
  user_id: string;
  push_enabled: boolean;
  sms_enabled: boolean;
  email_enabled: boolean;
  loan_updates: boolean;
  assistance_notifications: boolean;
  fines: boolean;
  meeting_reminders: boolean;
  attendance_deadlines: boolean;
  announcements: boolean;
  payment_reminders: boolean;
}

async function build(payload: Payload, admin: ReturnType<typeof createClient>): Promise<BuiltMessage | null> {
  const { data: fam } = await admin.from("families").select("name, slug").eq("id", payload.family_id ?? "").maybeSingle();
  const familyName = (fam?.name as string) ?? "Family";
  const slug = (fam?.slug as string) ?? "";
  const familyBase = slug ? `/family/${slug}` : "";

  switch (payload.event) {
    case "loan_requested":
      return {
        title: `💰 New loan request — ${familyName}`,
        body: `${payload.purpose ?? "A member"} requested ${payload.amount ?? ""}`,
        link: `${familyBase}/loans`,
        prefField: "loan_updates",
        recipients: "leaders",
        critical: false,
      };
    case "loan_approved":
      return {
        title: `✅ Loan approved`,
        body: `Your loan request for ${payload.amount ?? ""} has been approved.`,
        link: `${familyBase}/loans`,
        prefField: "loan_updates",
        recipients: "member",
        critical: true,
      };
    case "loan_rejected":
      return {
        title: `❌ Loan declined`,
        body: `Your loan request was not approved. Tap for details.`,
        link: `${familyBase}/loans`,
        prefField: "loan_updates",
        recipients: "member",
        critical: true,
      };
    case "loan_disbursed":
      return {
        title: `💸 Loan disbursed`,
        body: `Funds for your loan have been released.`,
        link: `${familyBase}/loans`,
        prefField: "loan_updates",
        recipients: "member",
        critical: true,
      };
    case "assistance_created": {
      const ev = String(payload.event_type ?? "event");
      const who = payload.beneficiary_name ? ` for ${payload.beneficiary_name}` : "";
      return {
        title: `🤝 ${familyName}: ${ev}`,
        body: `A new assistance event${who} has been recorded.`,
        link: `${familyBase}/assistance`,
        prefField: "assistance_notifications",
        recipients: "family",
        critical: ev.toLowerCase() === "death",
      };
    }
    case "fine_issued":
      return {
        title: `⚠️ New fine`,
        body: `You have a new fine of ${payload.amount ?? ""}.`,
        link: `${familyBase}/contributions`,
        prefField: "fines",
        recipients: "member",
        critical: true,
      };
    default:
      return null;
  }
}

async function recipientUserIds(
  payload: Payload,
  admin: ReturnType<typeof createClient>,
  scope: BuiltMessage["recipients"]
): Promise<string[]> {
  if (!payload.family_id) return [];
  if (scope === "member" && payload.member_id) {
    const { data } = await admin
      .from("family_members")
      .select("user_id")
      .eq("id", payload.member_id)
      .maybeSingle();
    return data?.user_id ? [String(data.user_id)] : [];
  }
  if (scope === "leaders") {
    const { data } = await admin
      .from("family_members")
      .select("user_id, role")
      .eq("family_id", payload.family_id)
      .in("role", ["family_head", "loan_committee", "treasurer", "family_admin"]);
    return (data ?? []).map((r) => String(r.user_id));
  }
  // family
  const { data } = await admin
    .from("family_members")
    .select("user_id")
    .eq("family_id", payload.family_id);
  return (data ?? []).map((r) => String(r.user_id));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const provided = req.headers.get("x-cron-secret") ?? "";
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: ok } = await admin.rpc("verify_cron_secret", { provided });
    if (!ok) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as Payload;
    const msg = await build(payload, admin);
    if (!msg) {
      return new Response(JSON.stringify({ skipped: true, reason: "unknown event" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = await recipientUserIds(payload, admin, msg.recipients);
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, recipients: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: profiles }, { data: prefs }] = await Promise.all([
      admin.from("profiles").select("id, push_token, phone").in("id", userIds),
      admin
        .from("notification_preferences")
        .select("user_id, push_enabled, sms_enabled, email_enabled, loan_updates, assistance_notifications, fines, meeting_reminders, attendance_deadlines, announcements, payment_reminders")
        .in("user_id", userIds)
        .is("family_id", null),
    ]);

    const prefMap = new Map<string, PrefRow>(
      (prefs ?? []).map((p) => [String(p.user_id), p as unknown as PrefRow])
    );
    const profMap = new Map<string, { push_token: string | null; phone: string | null }>(
      (profiles ?? []).map((p) => [String(p.id), { push_token: p.push_token, phone: p.phone }])
    );

    // 1) Inbox rows for everyone (always)
    const inboxRows = userIds.map((uid) => ({
      user_id: uid,
      family_id: payload.family_id ?? null,
      title: msg.title,
      body: msg.body,
      notification_type: payload.event,
      reference_table: payload.table,
      reference_id: payload.record_id,
      link: msg.link,
      data: payload as unknown as Record<string, unknown>,
      channels: ["inapp"],
    }));
    await admin.from("in_app_notifications").insert(inboxRows);

    // 2) Push + SMS fanout
    const sa: ServiceAccount | null = FIREBASE_SERVICE_ACCOUNT ? JSON.parse(FIREBASE_SERVICE_ACCOUNT) : null;
    let pushed = 0;
    let smsSent = 0;

    await Promise.all(
      userIds.map(async (uid) => {
        const pref = prefMap.get(uid);
        const prof = profMap.get(uid);
        const typeOptIn = (pref?.[msg.prefField] as boolean | undefined) ?? true;
        if (!typeOptIn) return;

        const pushOn = pref?.push_enabled ?? true;
        let delivered = false;
        if (pushOn && prof?.push_token && sa) {
          try {
            const status = await sendFcm(sa, prof.push_token, msg.title, msg.body, {
              url: msg.link,
              type: payload.event,
              reference_id: payload.record_id,
            });
            if (status >= 200 && status < 300) {
              pushed++;
              delivered = true;
            }
          } catch (e) {
            console.warn("[dispatch] fcm failed", e);
          }
        }

        // SMS fallback only for critical events when push didn't go through
        if (!delivered && msg.critical && (pref?.sms_enabled ?? false) && prof?.phone) {
          const ok = await sendSms(prof.phone, `${msg.title}\n${msg.body}`);
          if (ok) smsSent++;
        }
      })
    );

    return new Response(
      JSON.stringify({ ok: true, recipients: userIds.length, pushed, smsSent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[dispatch-event-push] error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

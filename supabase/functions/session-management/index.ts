// Unified session management edge function.
// Actions: list | revoke | revoke-others | record | enforce-limit
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireAuth } from "../_shared/auth.ts";

const MAX_SESSIONS = 3;

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

function deviceLabel(ua: string | null): string {
  if (!ua) return "Unknown device";
  const s = ua;
  let os = "Unknown OS";
  if (/Windows/i.test(s)) os = "Windows";
  else if (/Android/i.test(s)) os = "Android";
  else if (/iPhone|iPad|iOS/i.test(s)) os = "iOS";
  else if (/Mac OS X|Macintosh/i.test(s)) os = "macOS";
  else if (/Linux/i.test(s)) os = "Linux";
  let br = "Browser";
  if (/Edg\//i.test(s)) br = "Edge";
  else if (/Chrome\//i.test(s) && !/Chromium/i.test(s)) br = "Chrome";
  else if (/Firefox\//i.test(s)) br = "Firefox";
  else if (/Safari\//i.test(s)) br = "Safari";
  else if (/Kinsroot|Capacitor/i.test(s)) br = "Kinsroot App";
  return `${br} on ${os}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await requireAuth(req, corsHeaders);
    if (auth instanceof Response) return auth;
    const { userId } = auth;

    const url = new URL(req.url);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action: string = body.action ?? url.searchParams.get("action") ?? "list";
    const sb = admin();

    const currentSessionId: string | undefined =
      body.currentSessionId ?? url.searchParams.get("currentSessionId") ?? undefined;

    // Helpers
    const listSessions = async () => {
      const { data, error } = await sb.auth.admin.listUserSessions(userId);
      if (error) throw error;
      return data?.sessions ?? [];
    };

    if (action === "record") {
      const ua = req.headers.get("user-agent");
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
        req.headers.get("cf-connecting-ip") ??
        null;
      const sessionId = body.sessionId;
      if (!sessionId) {
        return new Response(JSON.stringify({ error: "sessionId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await sb.from("user_session_metadata").upsert({
        user_id: userId,
        session_id: sessionId,
        user_agent: ua,
        device_label: deviceLabel(ua),
        ip_address: ip,
        last_seen_at: new Date().toISOString(),
      }, { onConflict: "user_id,session_id" });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "enforce-limit") {
      const sessions = await listSessions();
      if (sessions.length <= MAX_SESSIONS) {
        return new Response(JSON.stringify({ ok: true, revoked: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Sort oldest first; keep current session, revoke oldest until <= MAX
      const sorted = [...sessions].sort((a: any, b: any) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      const toRevoke = sorted
        .filter((s: any) => s.id !== currentSessionId)
        .slice(0, Math.max(0, sessions.length - MAX_SESSIONS));
      for (const s of toRevoke) {
        try { await sb.auth.admin.signOut(s.id, "local"); } catch (e) { console.error(e); }
        await sb.from("user_session_metadata").delete()
          .eq("user_id", userId).eq("session_id", s.id);
      }
      return new Response(JSON.stringify({ ok: true, revoked: toRevoke.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list") {
      const sessions = await listSessions();
      const { data: meta } = await sb.from("user_session_metadata")
        .select("*").eq("user_id", userId);
      const metaMap = new Map((meta ?? []).map((m: any) => [m.session_id, m]));
      const merged = sessions.map((s: any) => ({
        id: s.id,
        created_at: s.created_at,
        updated_at: s.updated_at,
        not_after: s.not_after,
        user_agent: s.user_agent ?? metaMap.get(s.id)?.user_agent ?? null,
        device_label: metaMap.get(s.id)?.device_label ?? deviceLabel(s.user_agent ?? null),
        ip_address: metaMap.get(s.id)?.ip_address ?? null,
        last_seen_at: metaMap.get(s.id)?.last_seen_at ?? s.updated_at ?? s.created_at,
        is_current: currentSessionId ? s.id === currentSessionId : false,
      }));
      return new Response(JSON.stringify({ sessions: merged, max: MAX_SESSIONS }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "revoke") {
      const sessionId = body.sessionId;
      if (!sessionId) {
        return new Response(JSON.stringify({ error: "sessionId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const sessions = await listSessions();
      if (!sessions.find((s: any) => s.id === sessionId)) {
        return new Response(JSON.stringify({ error: "Session not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await sb.auth.admin.signOut(sessionId, "local");
      await sb.from("user_session_metadata").delete()
        .eq("user_id", userId).eq("session_id", sessionId);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "revoke-others") {
      const sessions = await listSessions();
      let count = 0;
      for (const s of sessions) {
        if (s.id === currentSessionId) continue;
        try {
          await sb.auth.admin.signOut(s.id, "local");
          count++;
        } catch (e) { console.error(e); }
      }
      await sb.from("user_session_metadata").delete()
        .eq("user_id", userId)
        .neq("session_id", currentSessionId ?? "00000000-0000-0000-0000-000000000000");
      return new Response(JSON.stringify({ ok: true, revoked: count }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("session-management error", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

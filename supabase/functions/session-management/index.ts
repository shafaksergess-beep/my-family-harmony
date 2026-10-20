import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { currentSessionId, revokeOtherSessions } from "./policy.ts";

const requestSchema = z.object({
  action: z.enum(["list", "record", "revoke-others"]),
  currentSessionId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
}).strict();

function deviceLabel(ua: string | null): string {
  if (!ua) return "Unknown device";
  const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad|iOS/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? "Windows" : /Mac OS X|Macintosh/i.test(ua) ? "macOS" : /Linux/i.test(ua) ? "Linux" : "Unknown OS";
  const browser = /Kinsroot|Natively|Capacitor/i.test(ua) ? "Kinsroot App" : /Edg\//i.test(ua) ? "Edge" : /Chrome\//i.test(ua) ? "Chrome" : /Firefox\//i.test(ua) ? "Firefox" : /Safari\//i.test(ua) ? "Safari" : "Browser";
  return `${browser} on ${os}`;
}

Deno.serve(async (req) => {
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const header = req.headers.get("Authorization");
    if (!header?.startsWith("Bearer ")) return reply({ error: "Unauthorized" }, 401);
    const jwt = header.slice(7);
    const client = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error: claimsError } = await client.auth.getClaims(jwt);
    if (claimsError || !data?.claims) return reply({ error: "Unauthorized" }, 401);
    const sid = currentSessionId(data.claims);
    const userId = data.claims.sub;
    if (!sid || !userId) return reply({ error: "Active session required" }, 401);
    const parsed = requestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return reply({ error: "Invalid or unsupported session action" }, 400);
    const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const list = async () => {
      const { data: sessions, error } = await sb.rpc("list_account_sessions", { p_user_id: userId, p_current_session_id: sid });
      if (error) throw error;
      return sessions ?? [];
    };
    // This also checks the session still exists; a signed JWT alone is insufficient.
    const sessions = await list();
    if (parsed.data.action === "record") {
      if (parsed.data.sessionId && parsed.data.sessionId !== sid) return reply({ error: "Session does not match authenticated device" }, 400);
      const ua = req.headers.get("user-agent");
      const { error } = await sb.from("user_session_metadata").upsert({
        user_id: userId, session_id: sid, user_agent: ua, device_label: deviceLabel(ua),
        ip_address: req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? req.headers.get("cf-connecting-ip") ?? null,
        last_seen_at: new Date().toISOString(),
      }, { onConflict: "user_id,session_id" });
      if (error) throw error;
      return reply({ ok: true });
    }
    if (parsed.data.action === "revoke-others") {
      await revokeOtherSessions((token, scope) => sb.auth.admin.signOut(token, scope), jwt);
      const remaining = await list();
      if (remaining.some((s: { id: string }) => s.id !== sid)) throw new Error("Other sessions remain active");
      return reply({ ok: true, revoked: sessions.filter((s: { id: string }) => s.id !== sid).length });
    }
    return reply({ sessions: sessions.map((s: { id: string; device_label: string | null; user_agent: string | null }) => ({
      ...s, device_label: s.device_label ?? deviceLabel(s.user_agent), is_current: s.id === sid,
    })) });
  } catch (error) {
    console.error("session-management operation failed", error);
    return reply({ error: "Could not complete session operation" }, 500);
  }
});

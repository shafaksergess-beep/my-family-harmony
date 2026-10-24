import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const schema = z.object({
  action: z.enum(["status", "suspend", "unsuspend", "reset-password"]),
  userId: z.string().uuid().optional(),
  userIds: z.array(z.string().uuid()).max(500).optional(),
  redirectTo: z.string().url().optional(),
}).strict();

const ALLOWED_REDIRECT_HOSTS = ["kinsroot.softserge.com", "kinsroot.softgroupsolutions.com", "my-family-harmony.lovable.app", "localhost"];

Deno.serve(async (req) => {
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const header = req.headers.get("Authorization");
    if (!header?.startsWith("Bearer ")) return reply({ error: "Unauthorized" }, 401);
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY") ?? "", { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: claims, error: claimsError } = await anon.auth.getClaims(header.slice(7));
    const callerId = claims?.claims?.sub;
    if (claimsError || !callerId) return reply({ error: "Unauthorized" }, 401);
    const sb = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: isSuper } = await sb.rpc("is_super_admin", { check_user_id: callerId });
    if (!isSuper) return reply({ error: "Forbidden" }, 403);

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return reply({ error: "Invalid request" }, 400);
    const { action, userId, userIds, redirectTo } = parsed.data;

    if (action === "status") {
      const ids = userIds ?? [];
      const suspended: string[] = [];
      await Promise.all(ids.map(async (id) => {
        const { data } = await sb.auth.admin.getUserById(id);
        const until = (data?.user as { banned_until?: string } | undefined)?.banned_until;
        if (until && new Date(until).getTime() > Date.now()) suspended.push(id);
      }));
      return reply({ suspended });
    }

    if (!userId) return reply({ error: "userId is required" }, 400);
    if (userId === callerId) return reply({ error: "You cannot perform this action on your own account" }, 400);
    const { data: targetSuper } = await sb.rpc("is_super_admin", { check_user_id: userId });

    if (action === "suspend" || action === "unsuspend") {
      if (targetSuper) return reply({ error: "Super admin accounts cannot be suspended" }, 400);
      const { error } = await sb.auth.admin.updateUserById(userId, { ban_duration: action === "suspend" ? "876000h" : "none" } as never);
      if (error) return reply({ error: "Could not update account" }, 500);
    } else {
      const { data: target } = await sb.auth.admin.getUserById(userId);
      const email = target?.user?.email;
      if (!email) return reply({ error: "This account has no email address" }, 400);
      let safeRedirect: string | undefined;
      if (redirectTo) {
        const host = new URL(redirectTo).hostname;
        if (ALLOWED_REDIRECT_HOSTS.includes(host) || host.endsWith(".lovable.app")) safeRedirect = redirectTo;
      }
      const { error } = await anon.auth.resetPasswordForEmail(email, safeRedirect ? { redirectTo: safeRedirect } : undefined);
      if (error) return reply({ error: "Could not send reset email" }, 500);
    }

    await sb.from("admin_logs").insert({ admin_user_id: callerId, action_type: action.toUpperCase().replace("-", "_"), entity_type: "user", entity_id: userId, details: {} } as never);
    return reply({ ok: true });
  } catch (_e) {
    return reply({ error: "Server error" }, 500);
  }
});

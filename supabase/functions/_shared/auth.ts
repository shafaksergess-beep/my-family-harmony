import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

export interface AuthResult {
  userId: string;
  authHeader: string;
}

/**
 * Verifies the Authorization Bearer JWT and returns the authenticated user id.
 * Returns a Response object on failure (caller should return it directly).
 */
export async function requireAuth(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<AuthResult | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = authHeader.replace("Bearer ", "");
  const client = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return { userId: data.user.id, authHeader };
}

/**
 * Verifies the authenticated user is a member of the given family.
 * Returns a Response on failure.
 */
export async function requireFamilyMember(
  userId: string,
  familyId: string,
  corsHeaders: Record<string, string>,
  requiredRoles?: string[],
): Promise<true | Response> {
  if (!familyId) {
    return new Response(JSON.stringify({ error: "familyId is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  let query = admin
    .from("family_members")
    .select("id, role")
    .eq("user_id", userId)
    .eq("family_id", familyId);
  if (requiredRoles && requiredRoles.length > 0) {
    query = query.in("role", requiredRoles);
  }
  const { data, error } = await query.maybeSingle();
  if (error || !data) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return true;
}

/**
 * Verifies an x-cron-secret header matches CRON_SECRET (env) or private.cron_config.
 * Returns a Response on failure.
 */
export async function requireCronSecret(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<true | Response> {
  const provided = req.headers.get("x-cron-secret") ?? "";
  const envSecret = Deno.env.get("CRON_SECRET");
  if (envSecret && provided && provided === envSecret) return true;
  if (provided) {
    try {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );
      const { data } = await admin.rpc("verify_cron_secret", { provided });
      if (data === true) return true;
    } catch (e) {
      console.error("verify_cron_secret rpc failed", e);
    }
  }
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

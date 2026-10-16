import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAuth } from "../_shared/auth.ts";
import { deletionPolicy } from "./policy.ts";

Deno.serve(async (req) => {
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireAuth(req, corsHeaders);
  if (auth instanceof Response) return auth;
  try {
    const body = await req.json().catch(() => null);
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });
    const { data: { user }, error: userError } = await admin.auth.admin.getUserById(auth.userId);
    if (userError || !user) return reply(401, { code: "unauthorized" });
    const policy = deletionPolicy(req.method, body, user.last_sign_in_at);
    if (policy) return reply(policy === "reauth" ? 403 : 400, { code: policy });
    // Remove objects via the Storage API, not raw SQL. Owned receipts contain personal data.
    const { data: objects, error: objectsError } = await admin.schema("storage").from("objects").select("bucket_id,name").eq("owner_id", auth.userId);
    if (objectsError) throw objectsError;
    for (const bucket of new Set((objects ?? []).map(o => o.bucket_id))) {
      const paths = (objects ?? []).filter(o => o.bucket_id === bucket).map(o => o.name);
      const { error } = await admin.storage.from(bucket).remove(paths);
      if (error) throw error;
    }
    const { error: cleanupError } = await admin.rpc("prepare_account_deletion", { p_user_id: auth.userId });
    if (cleanupError) throw cleanupError;
    // Hard deletion revokes refresh sessions and removes linked sign-in identities.
    const { error: deleteError } = await admin.auth.admin.deleteUser(auth.userId);
    if (deleteError) throw deleteError;
    return reply(200, { deleted: true });
  } catch (error) {
    console.error("Account deletion failed", error instanceof Error ? error.message : "cleanup error");
    return reply(500, { code: "failed" });
  }
});
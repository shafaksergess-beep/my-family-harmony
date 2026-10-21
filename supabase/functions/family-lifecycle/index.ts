// Daily job: new families must reach 2 members within 14 days.
// Reminders 7/3/1 days before the deadline -> suspended at the deadline ->
// deletion warning 7 days before removal -> removed (soft delete) 30 days after suspension.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { brandedEmail, KINSROOT_SENDER, APP_URL } from "../_shared/emailLayout.ts";

const DAY = 86_400_000;
const SUSPENSION_DAYS = 30;

type Notice = { type: string; title: [string, string]; body: [string, string] };

function notice(type: string, name: string, days: number): Notice {
  switch (type) {
    case "reminder":
      return { type, title: ["Add members to keep your family active", "Ajoutez des membres pour garder votre famille active"],
        body: [`"${name}" has only one member. Invite at least one more member within ${days} day(s) or the family will be suspended.`,
               `« ${name} » n'a qu'un seul membre. Invitez au moins un autre membre dans les ${days} jour(s), sinon la famille sera suspendue.`] };
    case "suspended":
      return { type, title: ["Your family has been suspended", "Votre famille a été suspendue"],
        body: [`"${name}" was suspended because no members joined in time. Invite a member within ${SUSPENSION_DAYS} days to restore it, otherwise it will be deleted.`,
               `« ${name} » a été suspendue car aucun membre ne l'a rejointe à temps. Invitez un membre dans les ${SUSPENSION_DAYS} jours pour la rétablir, sinon elle sera supprimée.`] };
    case "deletion_warning":
      return { type, title: ["Your family will be deleted soon", "Votre famille sera bientôt supprimée"],
        body: [`"${name}" will be deleted in ${days} day(s). Invite a member now to keep it.`,
               `« ${name} » sera supprimée dans ${days} jour(s). Invitez un membre maintenant pour la conserver.`] };
    default:
      return { type, title: ["Your family has been deleted", "Votre famille a été supprimée"],
        body: [`"${name}" was deleted because it never had other members. Contact softserge.dev@gmail.com within 100 days to restore it.`,
               `« ${name} » a été supprimée car elle n'a jamais eu d'autres membres. Contactez softserge.dev@gmail.com dans les 100 jours pour la restaurer.`] };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const provided = req.headers.get("x-cron-secret");
  let ok = !!provided && provided === Deno.env.get("CRON_SECRET");
  if (!ok && provided) { const { data } = await admin.rpc("verify_cron_secret", { provided }); ok = data === true; }
  if (!ok) return json({ error: "Unauthorized" }, 401);

  const now = Date.now();
  const { data: families, error } = await admin.from("families")
    .select("id,name,slug,primary_language,member_deadline_at,suspended_at")
    .eq("is_active", true).not("member_deadline_at", "is", null);
  if (error) return json({ error: error.message }, 500);

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const results: Record<string, string> = {};

  for (const f of families ?? []) {
    const { data: members } = await admin.from("family_members").select("user_id,role").eq("family_id", f.id);
    if ((members?.length ?? 0) >= 2) {
      await admin.from("families").update({ member_deadline_at: null, suspended_at: null }).eq("id", f.id);
      results[f.slug] = "requirement met"; continue;
    }
    const deadline = new Date(f.member_deadline_at!).getTime();
    let type: string | null = null; let days = 0; let cycle = f.member_deadline_at!;

    if (!f.suspended_at) {
      const left = Math.ceil((deadline - now) / DAY);
      if (now >= deadline) {
        await admin.from("families").update({ suspended_at: new Date().toISOString() }).eq("id", f.id);
        type = "suspended";
      } else {
        const t = [1, 3, 7].find((d) => left <= d);
        if (t) { type = "reminder"; days = left; cycle = `${f.member_deadline_at}:${t}`; }
      }
    } else {
      const removeAt = new Date(f.suspended_at).getTime() + SUSPENSION_DAYS * DAY;
      const left = Math.ceil((removeAt - now) / DAY);
      if (now >= removeAt) {
        await admin.from("families").update({ is_active: false, deactivated_at: new Date().toISOString() }).eq("id", f.id);
        type = "deleted";
      } else if (left <= 7) { type = "deletion_warning"; days = left; }
      cycle = f.suspended_at;
    }
    if (!type) { results[f.slug] = "no action"; continue; }

    const { error: dupErr } = await admin.from("family_lifecycle_notices")
      .insert({ family_id: f.id, notice_type: type, cycle_key: cycle });
    if (dupErr) { results[f.slug] = `${type} (already sent)`; continue; }

    const n = notice(type, f.name, days);
    const heads = (members ?? []).filter((m) => ["family_head", "family_admin"].includes(m.role ?? ""));
    for (const h of heads) {
      const { data: p } = await admin.from("profiles").select("email,preferred_language,push_token").eq("id", h.user_id).maybeSingle();
      const lang = (p?.preferred_language || f.primary_language) === "fr" ? 1 : 0;
      const link = type === "deleted" ? "/dashboard" : `/family/${f.slug}/invitations`;
      await admin.from("in_app_notifications").insert({
        user_id: h.user_id, family_id: f.id, title: n.title[lang], body: n.body[lang],
        notification_type: `family_${type}`, link, channels: ["in_app", "email", "push"],
      });
      if (p?.push_token) {
        await admin.functions.invoke("send-fcm-push", { body: { tokens: [p.push_token], title: n.title[lang], body: n.body[lang], url: link } }).catch(() => {});
      }
      if (resendKey && p?.email) {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST", headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: KINSROOT_SENDER, to: [p.email], subject: n.title[lang],
            html: brandedEmail({ title: n.title[lang], bodyHtml: `<p>${n.body[lang]}</p>`, lang: lang ? "fr" : "en",
              ctaLabel: type === "deleted" ? undefined : (lang ? "Inviter des membres" : "Invite members"), ctaUrl: `${APP_URL}${link}` }) }),
        });
        if (!r.ok) console.error("email failed", r.status, await r.text());
      }
    }
    results[f.slug] = type;
  }
  return json({ processed: families?.length ?? 0, results });
});

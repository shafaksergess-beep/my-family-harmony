// Sends push (via dispatch-event-push) for contributions due today or tomorrow.
// Runs daily via pg_cron.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Verify cron secret
  const provided = req.headers.get("x-cron-secret");
  if (!provided || provided !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);

    // Contributions due today or tomorrow, still unpaid
    const { data: due, error } = await sb
      .from("contributions")
      .select("id, family_id, member_id, amount, contribution_date, status, type")
      .neq("status", "paid")
      .gte("contribution_date", today.toISOString().slice(0, 10))
      .lt("contribution_date", dayAfter.toISOString().slice(0, 10));

    if (error) throw error;

    let dispatched = 0;
    for (const c of due ?? []) {
      const dueDay = new Date(c.contribution_date);
      dueDay.setHours(0, 0, 0, 0);
      const isTomorrow = dueDay.getTime() === tomorrow.getTime();
      const payload = {
        event: "contribution_due",
        table: "contributions",
        record_id: c.id,
        family_id: c.family_id,
        member_id: c.member_id,
        amount: c.amount,
        due_date: c.contribution_date,
        title: isTomorrow ? "Contribution due tomorrow" : "Contribution due today",
        body: `Your contribution of ${c.amount} is due ${isTomorrow ? "tomorrow" : "today"}.`,
      };
      const r = await fetch(`${SUPABASE_URL}/functions/v1/dispatch-event-push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cron-secret": CRON_SECRET,
          apikey: SERVICE_ROLE,
          Authorization: `Bearer ${SERVICE_ROLE}`,
        },
        body: JSON.stringify(payload),
      });
      if (r.ok) dispatched++;
      else console.warn("dispatch failed", c.id, r.status, await r.text());
    }

    return new Response(
      JSON.stringify({ ok: true, checked: due?.length ?? 0, dispatched }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("send-contribution-due-push error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limiting
interface RateLimitEntry { count: number; resetAt: number; }
const rateLimitStore = new Map<string, RateLimitEntry>();
const MAX_REQ = 15; // 15 requests per minute
const WINDOW_MS = 60_000;

function checkRate(id: string): { blocked: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(id);
  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(id, { count: 1, resetAt: now + WINDOW_MS });
    return { blocked: false, remaining: MAX_REQ - 1 };
  }
  entry.count++;
  if (entry.count > MAX_REQ) return { blocked: true, remaining: 0 };
  return { blocked: false, remaining: MAX_REQ - entry.count };
}

// Cleanup every 5 min
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimitStore) if (now >= v.resetAt) rateLimitStore.delete(k);
}, 300_000);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

    // Auth user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    // Rate limit per user
    const rl = checkRate(user.id);
    if (rl.blocked) {
      return new Response(JSON.stringify({ error: "Too many requests. Please wait a minute." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-RateLimit-Remaining": "0" },
      });
    }

    const { messages, familyId } = await req.json();
    if (!messages || !familyId) throw new Error("Missing messages or familyId");

    // Fetch user's context using service role
    const adminClient = createClient(supabaseUrl, supabaseKey);

    // Verify membership
    const { data: membership } = await adminClient
      .from("family_members")
      .select("id, role, house_name, profiles(full_name)")
      .eq("family_id", familyId)
      .eq("user_id", user.id)
      .single();

    if (!membership) throw new Error("Not a member of this family");

    // Fetch data in parallel
    const [familyRes, contribRes, savingsRes, loansRes, sharesRes, meetingsRes, njangiRes, assistRes] =
      await Promise.all([
        adminClient.from("families").select("name, mandatory_contribution, njangi_amount, loan_interest_rate, share_value, meeting_day, meeting_frequency, meeting_time").eq("id", familyId).single(),
        adminClient.from("contributions").select("amount, status, type, contribution_date").eq("family_id", familyId).eq("member_id", membership.id).order("contribution_date", { ascending: false }).limit(20),
        adminClient.from("savings").select("amount, month, notes").eq("family_id", familyId).eq("member_id", membership.id).order("month", { ascending: false }).limit(12),
        adminClient.from("loans").select("amount, amount_paid, interest_rate, status, purpose, due_date, term_months").eq("family_id", familyId).eq("member_id", membership.id),
        adminClient.from("shares").select("share_count, share_value, purchase_date, is_active").eq("family_id", familyId).eq("member_id", membership.id),
        adminClient.from("meetings").select("meeting_date, meeting_type, is_completed, location").eq("family_id", familyId).order("meeting_date", { ascending: false }).limit(10),
        adminClient.from("njangi_participants").select("payout_order, payout_date, amount_received, is_paid, njangi_cycles(cycle_name, amount_per_person, start_date, end_date)").eq("member_id", membership.id).limit(10),
        adminClient.from("assistance_events").select("event_type, amount, event_date, is_paid, beneficiary_name").eq("family_id", familyId).eq("member_id", membership.id).limit(10),
      ]);

    // Also get family-wide summary stats
    const [totalMembersRes, totalContribRes, totalLoansRes] = await Promise.all([
      adminClient.from("family_members").select("id", { count: "exact", head: true }).eq("family_id", familyId),
      adminClient.from("contributions").select("amount").eq("family_id", familyId).eq("status", "paid"),
      adminClient.from("loans").select("amount, amount_paid").eq("family_id", familyId).in("status", ["approved", "disbursed"]),
    ]);

    const totalContributions = (totalContribRes.data || []).reduce((s, c) => s + Number(c.amount), 0);
    const totalLoansOutstanding = (totalLoansRes.data || []).reduce((s, l) => s + (Number(l.amount) - Number(l.amount_paid || 0)), 0);

    const userShares = (sharesRes.data || []).filter((s: any) => s.is_active);
    const totalShareCount = userShares.reduce((s: number, sh: any) => s + (sh.share_count || 1), 0);
    const totalShareValue = userShares.reduce((s: number, sh: any) => s + (sh.share_count || 1) * Number(sh.share_value), 0);

    const userContribPaid = (contribRes.data || []).filter((c: any) => c.status === "paid").reduce((s: number, c: any) => s + Number(c.amount), 0);
    const userContribPending = (contribRes.data || []).filter((c: any) => c.status === "pending").reduce((s: number, c: any) => s + Number(c.amount), 0);
    const userSavingsTotal = (savingsRes.data || []).reduce((s: number, sv: any) => s + Number(sv.amount), 0);
    const userLoans = loansRes.data || [];

    const contextPrompt = `You are a helpful family finance assistant for the "${familyRes.data?.name}" family group. You answer questions about the user's financial data, meetings, njangi, and family activities. Be concise, friendly, and use numbers/dates when relevant. All amounts are in XAF (Central African CFA Franc) unless specified otherwise.

USER CONTEXT:
- Name: ${(membership as any).profiles?.full_name || "Member"}
- Role: ${membership.role}
- House: ${membership.house_name || "Not assigned"}

FAMILY INFO:
- Name: ${familyRes.data?.name}
- Total members: ${totalMembersRes.count || 0}
- Mandatory contribution: ${familyRes.data?.mandatory_contribution} XAF
- Njangi amount: ${familyRes.data?.njangi_amount} XAF
- Loan interest rate: ${familyRes.data?.loan_interest_rate}%
- Share value: ${familyRes.data?.share_value} XAF
- Meeting schedule: ${familyRes.data?.meeting_day}, ${familyRes.data?.meeting_frequency}, at ${familyRes.data?.meeting_time}
- Total family contributions (paid): ${totalContributions} XAF
- Total family loans outstanding: ${totalLoansOutstanding} XAF

USER FINANCIAL SUMMARY:
- Contributions paid: ${userContribPaid} XAF
- Contributions pending: ${userContribPending} XAF
- Total savings: ${userSavingsTotal} XAF
- Shares: ${totalShareCount} shares worth ${totalShareValue} XAF
- Active loans: ${userLoans.filter((l: any) => ["approved", "disbursed"].includes(l.status)).length}
${userLoans.filter((l: any) => ["approved", "disbursed"].includes(l.status)).map((l: any) => `  - Loan: ${l.amount} XAF for "${l.purpose}", paid ${l.amount_paid || 0} XAF, due ${l.due_date || "N/A"}`).join("\n")}

RECENT CONTRIBUTIONS (last 20):
${(contribRes.data || []).map((c: any) => `- ${c.contribution_date}: ${c.amount} XAF (${c.type}, ${c.status})`).join("\n") || "None"}

SAVINGS (last 12 months):
${(savingsRes.data || []).map((s: any) => `- ${s.month}: ${s.amount} XAF`).join("\n") || "None"}

RECENT MEETINGS (last 10):
${(meetingsRes.data || []).map((m: any) => `- ${m.meeting_date}: ${m.meeting_type} (${m.is_completed ? "completed" : "upcoming"})`).join("\n") || "None"}

NJANGI PARTICIPATION:
${(njangiRes.data || []).map((n: any) => `- Order #${n.payout_order}, payout: ${n.payout_date || "TBD"}, amount: ${n.amount_received || "pending"} XAF, paid: ${n.is_paid}`).join("\n") || "None"}

ASSISTANCE EVENTS:
${(assistRes.data || []).map((a: any) => `- ${a.event_date}: ${a.event_type}, ${a.amount} XAF, paid: ${a.is_paid}`).join("\n") || "None"}

Only answer questions related to this family and the user's data. If asked about other families or users, politely decline. Keep answers brief and helpful.`;

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: contextPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResponse.text();
      console.error("AI error:", aiResponse.status, t);
      throw new Error("AI gateway error");
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chatbot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

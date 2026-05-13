import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

interface DigestRequest {
  familyId?: string;
  period: "weekly" | "monthly";
  testMode?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify cron secret for security
  const cronSecret = req.headers.get('x-cron-secret');
  const envSecret = Deno.env.get('CRON_SECRET');
  let authorized = !!cronSecret && cronSecret === envSecret;
  if (!authorized && cronSecret) {
    try {
      const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data } = await sb.rpc('verify_cron_secret', { provided: cronSecret });
      authorized = data === true;
    } catch (e) { console.error('verify_cron_secret rpc failed', e); }
  }
  if (!authorized) {
    console.error('Unauthorized: Invalid or missing cron secret');
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }), 
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { familyId, period, testMode }: DigestRequest = await req.json();

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    if (period === "weekly") {
      startDate.setDate(now.getDate() - 7);
    } else {
      startDate.setMonth(now.getMonth() - 1);
    }

    // Get families to send digests to
    const familiesQuery = familyId
      ? supabase.from("families").select("*").eq("id", familyId)
      : supabase.from("families").select("*").eq("is_active", true);

    const { data: families, error: familiesError } = await familiesQuery;
    if (familiesError) throw familiesError;

    const results = [];

    for (const family of families || []) {
      // Get family heads and members with digest preferences
      const { data: members } = await supabase
        .from("family_members")
        .select(`
          user_id,
          role,
          profiles:user_id (email, full_name)
        `)
        .eq("family_id", family.id)
        .in("role", ["family_head", "treasurer"]);

      if (!members || members.length === 0) continue;

      // Fetch activity data for the period
      const [contributions, loans, meetings, assistance] = await Promise.all([
        supabase
          .from("contributions")
          .select("amount, status")
          .eq("family_id", family.id)
          .gte("created_at", startDate.toISOString()),
        supabase
          .from("loans")
          .select("amount, status")
          .eq("family_id", family.id)
          .gte("created_at", startDate.toISOString()),
        supabase
          .from("meetings")
          .select("id, meeting_date")
          .eq("family_id", family.id)
          .gte("meeting_date", startDate.toISOString().split("T")[0]),
        supabase
          .from("assistance_events")
          .select("amount, event_type")
          .eq("family_id", family.id)
          .gte("created_at", startDate.toISOString()),
      ]);

      // Calculate statistics
      const stats = {
        totalContributions: contributions.data?.reduce((sum, c) => sum + Number(c.amount), 0) || 0,
        pendingContributions: contributions.data?.filter(c => c.status === "pending").length || 0,
        totalLoans: loans.data?.reduce((sum, l) => sum + Number(l.amount), 0) || 0,
        activeLoans: loans.data?.filter(l => l.status === "active").length || 0,
        meetingsHeld: meetings.data?.length || 0,
        assistanceEvents: assistance.data?.length || 0,
        totalAssistance: assistance.data?.reduce((sum, a) => sum + Number(a.amount), 0) || 0,
      };

      // Generate email HTML
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; }
            .stat-card { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .stat-value { font-size: 32px; font-weight: bold; color: #667eea; }
            .stat-label { color: #6b7280; font-size: 14px; margin-top: 5px; }
            .footer { background: #1f2937; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
            .highlight { color: #667eea; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="https://31382291-0546-4a70-a015-b86eb65a55a3.lovableproject.com/logo.jpg" alt="Family Together" style="width: 70px; height: 70px; border-radius: 50%; margin-bottom: 16px; border: 3px solid rgba(255,255,255,0.3);" />
              <h1>${family.name}</h1>
              <p>${period === "weekly" ? "Weekly" : "Monthly"} Digest</p>
              <p>${startDate.toLocaleDateString()} - ${now.toLocaleDateString()}</p>
            </div>
            
            <div class="content">
              <h2>Financial Overview</h2>
              
              <div class="stat-card">
                <div class="stat-value">${stats.totalContributions.toLocaleString()} FCFA</div>
                <div class="stat-label">Total Contributions</div>
                ${stats.pendingContributions > 0 ? `<p style="color: #ef4444; margin-top: 10px;">${stats.pendingContributions} pending contributions</p>` : ""}
              </div>

              <div class="stat-card">
                <div class="stat-value">${stats.totalLoans.toLocaleString()} FCFA</div>
                <div class="stat-label">Total Loans Disbursed</div>
                <p style="margin-top: 10px;">${stats.activeLoans} active loans</p>
              </div>

              <div class="stat-card">
                <div class="stat-value">${stats.totalAssistance.toLocaleString()} FCFA</div>
                <div class="stat-label">Assistance Provided</div>
                <p style="margin-top: 10px;">${stats.assistanceEvents} assistance events</p>
              </div>

              <h2 style="margin-top: 30px;">Activity Summary</h2>
              
              <div class="stat-card">
                <div class="stat-value">${stats.meetingsHeld}</div>
                <div class="stat-label">Meetings Held</div>
              </div>

              ${meetings.data && meetings.data.length > 0 ? `
                <h3>Upcoming Meetings</h3>
                ${meetings.data.filter(m => new Date(m.meeting_date) > now).slice(0, 3).map(m => 
                  `<p>📅 ${new Date(m.meeting_date).toLocaleDateString()}</p>`
                ).join("")}
              ` : ""}
            </div>

            <div class="footer">
              <p>This is an automated digest from Family Together</p>
              <p>Visit your family dashboard to see more details</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Send emails to family heads and treasurers
      for (const member of members) {
        const profile = member.profiles as any;
        if (!profile?.email) continue;

        try {
          await resend.emails.send({
            from: "Family Together <onboarding@resend.dev>",
            to: testMode ? profile.email : [profile.email],
            subject: `${family.name} - ${period === "weekly" ? "Weekly" : "Monthly"} Digest`,
            html: emailHtml,
          });

          results.push({
            family: family.name,
            recipient: profile.email,
            status: "sent",
          });
        } catch (emailError: any) {
          console.error(`Failed to send to ${profile.email}:`, emailError);
          results.push({
            family: family.name,
            recipient: profile.email,
            status: "failed",
            error: emailError?.message || "Unknown error",
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-digest function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

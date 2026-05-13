import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cron-secret",
};

interface BirthEvent {
  id: string;
  event_date: string;
  family_id: string;
  member_id: string;
  family_members: {
    id: string;
    user_id: string;
  }[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify CRON_SECRET for scheduled execution
    const cronSecret = req.headers.get("cron-secret") || req.headers.get("x-cron-secret");
    const envSecret = Deno.env.get("CRON_SECRET");
    let authorized = !!cronSecret && cronSecret === envSecret;
    if (!authorized && cronSecret) {
      try {
        const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data } = await sb.rpc('verify_cron_secret', { provided: cronSecret });
        authorized = data === true;
      } catch (e) { console.error('verify_cron_secret rpc failed', e); }
    }
    if (!authorized) {
      console.error("Unauthorized: Invalid or missing CRON_SECRET");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("Fetching birth events for visit deadline tracking...");

    // Calculate date ranges
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Fetch birth events from the last 6 months
    const { data: birthEvents, error: eventsError } = await supabase
      .from("assistance_events")
      .select(`
        id,
        event_date,
        family_id,
        member_id,
        family_members!inner (
          id,
          user_id
        )
      `)
      .eq("event_type", "birth")
      .gte("event_date", sixMonthsAgo.toISOString().split('T')[0]);

    if (eventsError) {
      console.error("Error fetching birth events:", eventsError);
      throw eventsError;
    }

    console.log(`Found ${birthEvents?.length || 0} birth events`);

    const reminders: Array<{ email: string; name: string; deadline: string; daysLeft: number }> = [];

    for (const event of (birthEvents || []) as BirthEvent[]) {
      const birthDate = new Date(event.event_date);
      const visitDeadline = new Date(birthDate);
      visitDeadline.setMonth(visitDeadline.getMonth() + 6);
      
      const daysUntilDeadline = Math.ceil((visitDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Send reminders for upcoming or overdue deadlines
      if (daysUntilDeadline <= 30 && daysUntilDeadline >= -7) {
        const member = event.family_members[0];
        if (!member) continue;

        // Fetch user profile for notification
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, email, phone")
          .eq("id", member.user_id)
          .single();

        if (profileError || !profile) {
          console.error(`Error fetching profile for user ${member.user_id}:`, profileError);
          continue;
        }

        // Fetch family info
        const { data: family, error: familyError } = await supabase
          .from("families")
          .select("name")
          .eq("id", event.family_id)
          .single();

        if (familyError || !family) {
          console.error(`Error fetching family ${event.family_id}:`, familyError);
          continue;
        }

        const urgencyLevel = daysUntilDeadline < 0 ? "OVERDUE" : daysUntilDeadline <= 7 ? "URGENT" : "REMINDER";
        
        // Send email reminder
        try {
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "Family Together <onboarding@resend.dev>",
              to: [profile.email],
              subject: `${urgencyLevel}: Birth Visit Deadline - ${family.name}`,
              html: `
                <h2>${urgencyLevel}: Birth Visit Deadline Reminder</h2>
                <p>Dear ${profile.full_name},</p>
                <p>This is a reminder about your birth visit obligation for ${family.name}.</p>
                <p><strong>Birth Date:</strong> ${new Date(event.event_date).toLocaleDateString()}</p>
                <p><strong>Visit Deadline:</strong> ${visitDeadline.toLocaleDateString()}</p>
                <p><strong>Status:</strong> ${daysUntilDeadline < 0 
                  ? `OVERDUE by ${Math.abs(daysUntilDeadline)} days` 
                  : `${daysUntilDeadline} days remaining`}
                </p>
                <p>According to family rules, you must visit the new baby within 6 months of delivery.</p>
                <p>Please ensure you fulfill this obligation promptly.</p>
                <br/>
                <p>Best regards,<br/>${family.name}</p>
              `,
            }),
          });

          if (!emailResponse.ok) {
            console.error(`Failed to send email to ${profile.email}:`, await emailResponse.text());
          } else {
            console.log(`Email reminder sent to ${profile.email}`);
          }
        } catch (emailError) {
          console.error(`Error sending email to ${profile.email}:`, emailError);
        }

        // Send SMS if Twilio is configured and urgent
        if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER && profile.phone && daysUntilDeadline <= 7) {
          try {
            const smsMessage = daysUntilDeadline < 0
              ? `OVERDUE: Your birth visit obligation for ${family.name} is ${Math.abs(daysUntilDeadline)} days overdue. Deadline was ${visitDeadline.toLocaleDateString()}.`
              : `URGENT: Birth visit deadline in ${daysUntilDeadline} days for ${family.name}. Visit by ${visitDeadline.toLocaleDateString()}.`;

            const smsResponse = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                  Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
                },
                body: new URLSearchParams({
                  To: profile.phone,
                  From: TWILIO_PHONE_NUMBER,
                  Body: smsMessage,
                }),
              }
            );

            if (!smsResponse.ok) {
              console.error(`Failed to send SMS to ${profile.phone}:`, await smsResponse.text());
            } else {
              console.log(`SMS reminder sent to ${profile.phone}`);
            }
          } catch (smsError) {
            console.error(`Error sending SMS to ${profile.phone}:`, smsError);
          }
        }

        reminders.push({
          email: profile.email,
          name: profile.full_name,
          deadline: visitDeadline.toISOString().split('T')[0],
          daysLeft: daysUntilDeadline,
        });
      }
    }

    console.log(`Sent ${reminders.length} birth visit reminders`);

    return new Response(
      JSON.stringify({
        success: true,
        remindersSent: reminders.length,
        reminders,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-birth-visit-reminders:", error);
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

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

interface ReminderRequest {
  meetingId: string;
  familyId: string;
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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { meetingId, familyId }: ReminderRequest = await req.json();

    // Fetch meeting details
    const { data: meeting, error: meetingError } = await supabaseClient
      .from("meetings")
      .select("*, families:family_id(name)")
      .eq("id", meetingId)
      .single();

    if (meetingError || !meeting) {
      throw new Error("Meeting not found");
    }

    // Fetch family members with profiles
    const { data: members, error: membersError } = await supabaseClient
      .from("family_members")
      .select("*, profiles:user_id(email, full_name)")
      .eq("family_id", familyId);

    if (membersError || !members) {
      throw new Error("Failed to fetch family members");
    }

    const familyName = meeting.families?.name || "your family";
    const meetingDate = new Date(meeting.meeting_date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const meetingTime = meeting.meeting_time || "13:00";

    // Send email to each member
    const emailPromises = members
      .filter((member) => member.profiles?.email)
      .map((member) =>
        resend.emails.send({
          from: "Family Together <onboarding@resend.dev>",
          to: [member.profiles.email],
          subject: `Reminder: ${familyName} Meeting on ${meetingDate}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px 10px 0 0;">
                <img src="https://31382291-0546-4a70-a015-b86eb65a55a3.lovableproject.com/logo.jpg" alt="Family Together" style="width: 60px; height: 60px; border-radius: 50%; margin-bottom: 16px; border: 3px solid rgba(255,255,255,0.3);" />
                <h1 style="color: white; margin: 0;">Meeting Reminder</h1>
              </div>
              <div style="padding: 30px; background: #f9f9f9;">
                <p>Hello ${member.profiles.full_name || "Family Member"},</p>
                <p>This is a reminder about the upcoming <strong>${familyName}</strong> meeting:</p>
                <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                  <p style="margin: 5px 0;"><strong>Date:</strong> ${meetingDate}</p>
                  <p style="margin: 5px 0;"><strong>Time:</strong> ${meetingTime}</p>
                  ${meeting.location ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${meeting.location}</p>` : ""}
                  ${meeting.host_house ? `<p style="margin: 5px 0;"><strong>Host House:</strong> ${meeting.host_house}</p>` : ""}
                </div>
                ${meeting.agenda ? `<p><strong>Agenda:</strong><br/>${meeting.agenda}</p>` : ""}
                <p style="color: #666; font-size: 14px; margin-top: 30px;">Please make sure to attend on time to avoid late fines.</p>
              </div>
              <div style="text-align: center; padding: 20px; color: #999; font-size: 12px; border-top: 1px solid #ddd;">
                © ${new Date().getFullYear()} Family Together. All rights reserved.
              </div>
            </div>
          `,
        })
      );

    const results = await Promise.allSettled(emailPromises);
    const emailSuccessCount = results.filter((r) => r.status === "fulfilled").length;
    const emailFailureCount = results.filter((r) => r.status === "rejected").length;

    console.log(`Email reminders sent: ${emailSuccessCount} successful, ${emailFailureCount} failed`);

    // Send SMS notifications using Twilio
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    let smsSuccessCount = 0;
    let smsFailureCount = 0;

    if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
      const smsMessage = `${familyName} Meeting Reminder\nDate: ${meetingDate}\nTime: ${meetingTime}${meeting.location ? `\nLocation: ${meeting.location}` : ""}${meeting.host_house ? `\nHost: ${meeting.host_house}` : ""}\nPlease attend on time to avoid fines.`;

      const smsPromises = members
        .filter((member) => member.profiles?.phone)
        .map(async (member) => {
          const authString = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
          const response = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
            {
              method: "POST",
              headers: {
                "Authorization": `Basic ${authString}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                To: member.profiles.phone,
                From: twilioPhoneNumber,
                Body: smsMessage,
              }),
            }
          );

          if (!response.ok) {
            throw new Error(`Failed to send SMS to ${member.profiles.phone}`);
          }

          return response.json();
        });

      const smsResults = await Promise.allSettled(smsPromises);
      smsSuccessCount = smsResults.filter((r) => r.status === "fulfilled").length;
      smsFailureCount = smsResults.filter((r) => r.status === "rejected").length;

      console.log(`SMS reminders sent: ${smsSuccessCount} successful, ${smsFailureCount} failed`);
    } else {
      console.log("Twilio credentials not configured, skipping SMS notifications");
    }

    // Record that reminder was sent
    await supabaseClient.from("meeting_reminders").insert({
      family_id: familyId,
      meeting_id: meetingId,
      reminder_type: "email",
      days_before: Math.ceil(
        (new Date(meeting.meeting_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ),
      sent_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        email: {
          sent: emailSuccessCount,
          failed: emailFailureCount,
        },
        sms: {
          sent: smsSuccessCount,
          failed: smsFailureCount,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending meeting reminders:", error);
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

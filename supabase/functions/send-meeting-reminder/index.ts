import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReminderRequest {
  meetingId: string;
  familyId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
              <h1 style="color: #333;">Meeting Reminder</h1>
              <p>Hello ${member.profiles.full_name || "Family Member"},</p>
              <p>This is a reminder about the upcoming <strong>${familyName}</strong> meeting:</p>
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Date:</strong> ${meetingDate}</p>
                <p style="margin: 5px 0;"><strong>Time:</strong> ${meetingTime}</p>
                ${meeting.location ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${meeting.location}</p>` : ""}
                ${meeting.host_house ? `<p style="margin: 5px 0;"><strong>Host House:</strong> ${meeting.host_house}</p>` : ""}
              </div>
              ${meeting.agenda ? `<p><strong>Agenda:</strong><br/>${meeting.agenda}</p>` : ""}
              <p style="color: #666; font-size: 14px; margin-top: 30px;">Please make sure to attend on time to avoid late fines.</p>
            </div>
          `,
        })
      );

    const results = await Promise.allSettled(emailPromises);
    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failureCount = results.filter((r) => r.status === "rejected").length;

    console.log(`Meeting reminders sent: ${successCount} successful, ${failureCount} failed`);

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
        sent: successCount,
        failed: failureCount,
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

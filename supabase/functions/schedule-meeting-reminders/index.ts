import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify cron secret for security
  const cronSecret = req.headers.get('x-cron-secret');
  const expectedSecret = Deno.env.get('CRON_SECRET');
  
  if (!cronSecret || cronSecret !== expectedSecret) {
    console.error('Unauthorized: Invalid or missing cron secret');
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }), 
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date();
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(now.getDate() + 7);
    
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(now.getDate() + 3);
    
    const oneDayFromNow = new Date(now);
    oneDayFromNow.setDate(now.getDate() + 1);

    // Get upcoming meetings within 7 days
    const { data: meetings, error: meetingsError } = await supabaseClient
      .from("meetings")
      .select("*, families:family_id(id, name)")
      .gte("meeting_date", now.toISOString().split('T')[0])
      .lte("meeting_date", sevenDaysFromNow.toISOString().split('T')[0])
      .eq("is_completed", false);

    if (meetingsError) throw meetingsError;

    console.log(`Found ${meetings?.length || 0} upcoming meetings`);

    const remindersSent = {
      seven_days: 0,
      three_days: 0,
      one_day: 0,
    };

    // Process each meeting
    for (const meeting of meetings || []) {
      const meetingDate = new Date(meeting.meeting_date);
      const daysUntilMeeting = Math.ceil((meetingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Determine which reminder to send
      let reminderType = "";
      if (daysUntilMeeting === 7) {
        reminderType = "7_days";
      } else if (daysUntilMeeting === 3) {
        reminderType = "3_days";
      } else if (daysUntilMeeting === 1) {
        reminderType = "1_day";
      } else {
        continue; // Skip if not a reminder day
      }

      // Check if reminder already sent
      const { data: existingReminder } = await supabaseClient
        .from("meeting_reminders")
        .select("*")
        .eq("meeting_id", meeting.id)
        .eq("reminder_type", "email")
        .eq("days_before", daysUntilMeeting)
        .maybeSingle();

      if (existingReminder) {
        console.log(`Reminder already sent for meeting ${meeting.id} (${reminderType})`);
        continue;
      }

      // Send reminder via edge function
      try {
        const { error: reminderError } = await supabaseClient.functions.invoke(
          "send-meeting-reminder",
          {
            body: {
              meetingId: meeting.id,
              familyId: meeting.families.id,
            },
          }
        );

        if (reminderError) {
          console.error(`Failed to send reminder for meeting ${meeting.id}:`, reminderError);
          continue;
        }

        console.log(`Sent ${reminderType} reminder for meeting ${meeting.id}`);
        
        if (daysUntilMeeting === 7) remindersSent.seven_days++;
        else if (daysUntilMeeting === 3) remindersSent.three_days++;
        else if (daysUntilMeeting === 1) remindersSent.one_day++;
      } catch (error) {
        console.error(`Error sending reminder for meeting ${meeting.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        meetings_checked: meetings?.length || 0,
        reminders_sent: remindersSent,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in schedule-meeting-reminders:", error);
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

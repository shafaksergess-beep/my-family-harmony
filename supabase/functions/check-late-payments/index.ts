import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReminderSettings {
  family_id: string;
  days_for_email: number;
  days_for_sms: number;
  days_for_whatsapp: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log("Checking for late payments on:", today.toISOString());

    // Get all unpaid contributions that are overdue
    const { data: lateContributions, error: contributionsError } = await supabaseClient
      .from("contributions")
      .select(`
        *,
        family_members!inner(
          family_id,
          profiles:user_id(full_name, email, phone)
        )
      `)
      .neq("status", "paid")
      .lt("contribution_date", today.toISOString());

    if (contributionsError) throw contributionsError;

    console.log(`Found ${lateContributions?.length || 0} late contributions`);

    const remindersSent = {
      email: 0,
      sms: 0,
      whatsapp: 0,
    };

    // Process each late contribution
    for (const contribution of lateContributions || []) {
      const contributionDate = new Date(contribution.contribution_date);
      const daysLate = Math.ceil((today.getTime() - contributionDate.getTime()) / (1000 * 60 * 60 * 24));

      console.log(`Processing contribution ${contribution.id}: ${daysLate} days late`);

      // Default escalation: Email at 1 day, SMS at 3 days, WhatsApp at 7 days
      let reminderType = "";
      if (daysLate >= 7) {
        reminderType = "whatsapp";
      } else if (daysLate >= 3) {
        reminderType = "sms";
      } else if (daysLate >= 1) {
        reminderType = "email";
      } else {
        continue;
      }

      // Check if reminder already sent today
      const { data: existingReminder } = await supabaseClient
        .from("payment_reminders")
        .select("*")
        .eq("contribution_id", contribution.id)
        .eq("reminder_type", reminderType)
        .gte("sent_at", today.toISOString())
        .maybeSingle();

      if (existingReminder) {
        console.log(`Reminder already sent for contribution ${contribution.id} (${reminderType})`);
        continue;
      }

      const memberEmail = contribution.family_members?.profiles?.email;
      const memberPhone = contribution.family_members?.profiles?.phone;
      const memberName = contribution.family_members?.profiles?.full_name || "Member";

      try {
        if (reminderType === "email" && memberEmail) {
          // Send email reminder
          const { error: emailError } = await supabaseClient.functions.invoke("send-notification", {
            body: {
              to: memberEmail,
              subject: `Payment Reminder: ${daysLate} days overdue`,
              message: `Dear ${memberName},\n\nThis is a reminder that your contribution of ${contribution.amount} FCFA due on ${contributionDate.toLocaleDateString()} is now ${daysLate} days overdue.\n\nPlease make your payment as soon as possible to avoid additional late fees.\n\nThank you.`,
            },
          });

          if (emailError) throw emailError;
          remindersSent.email++;
        } else if (reminderType === "sms" && memberPhone) {
          // Send SMS reminder
          const { error: smsError } = await supabaseClient.functions.invoke("send-sms", {
            body: {
              to: memberPhone,
              message: `Payment Reminder: Your contribution of ${contribution.amount} FCFA is ${daysLate} days overdue. Please pay ASAP to avoid late fees.`,
            },
          });

          if (smsError) throw smsError;
          remindersSent.sms++;
        } else if (reminderType === "whatsapp" && memberPhone) {
          // Send WhatsApp reminder (via Twilio or similar)
          const { error: whatsappError } = await supabaseClient.functions.invoke("send-sms", {
            body: {
              to: `whatsapp:${memberPhone}`,
              message: `🔔 *Payment Reminder*\n\nDear ${memberName},\n\nYour contribution of *${contribution.amount} FCFA* is now *${daysLate} days overdue*.\n\nDue date: ${contributionDate.toLocaleDateString()}\n\nPlease make your payment urgently to avoid additional late fees.\n\nThank you!`,
            },
          });

          if (whatsappError) throw whatsappError;
          remindersSent.whatsapp++;
        }

        // Record the reminder
        await supabaseClient.from("payment_reminders").insert({
          contribution_id: contribution.id,
          family_id: contribution.family_members.family_id,
          reminder_type: reminderType,
          days_late: daysLate,
          sent_at: new Date().toISOString(),
        });

        console.log(`Sent ${reminderType} reminder for contribution ${contribution.id}`);
      } catch (error) {
        console.error(`Error sending ${reminderType} reminder for contribution ${contribution.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        late_contributions: lateContributions?.length || 0,
        reminders_sent: remindersSent,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in check-late-payments:", error);
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

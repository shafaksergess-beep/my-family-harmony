import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { checkRateLimit, recordRequest, getIpAddress } from "../_shared/rateLimiter.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  to?: string | string[];
  subject?: string;
  userName?: string;
  familyName?: string;
  eventType?: string;
  eventDetails?: string;
  actionUrl?: string;
  message?: string;
  type?: 'family_created' | 'member_added' | 'role_changed' | 'meeting_scheduled' | 'general';
  familyId?: string;
  title?: string;
  data?: Record<string, any>;
}

async function sendWhatsAppMessage(to: string, message: string): Promise<boolean> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!accountSid || !authToken || !twilioPhone) {
    console.log("Twilio credentials not configured, skipping WhatsApp");
    return false;
  }

  try {
    const auth = btoa(`${accountSid}:${authToken}`);
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    // Format phone for WhatsApp
    const whatsappTo = to.startsWith("+") ? `whatsapp:${to}` : `whatsapp:+${to}`;
    const whatsappFrom = `whatsapp:${twilioPhone}`;

    const formData = new URLSearchParams();
    formData.append("To", whatsappTo);
    formData.append("From", whatsappFrom);
    formData.append("Body", message);

    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("WhatsApp send error:", errorData);
      return false;
    }

    console.log("WhatsApp message sent to:", to);
    return true;
  } catch (error) {
    console.error("WhatsApp send failed:", error);
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { requireAuth } = await import("../_shared/auth.ts");
  const auth = await requireAuth(req, corsHeaders);
  if (auth instanceof Response) return auth;

  try {
    const ipAddress = getIpAddress(req);
    const rateLimitCheck = checkRateLimit(ipAddress);
    
    if (rateLimitCheck.isBlocked) {
      const minutesBlocked = Math.ceil((rateLimitCheck.blockedUntil! - Date.now()) / 60000);
      return new Response(
        JSON.stringify({ error: `Too many requests. Please try again in ${minutesBlocked} minute(s).` }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    recordRequest(ipAddress);
    
    const requestData: NotificationRequest = await req.json();
    const { type, familyId, title, message, data } = requestData;

    // Handle meeting_scheduled notification type
    if (type === 'meeting_scheduled' && familyId) {
      const { requireFamilyMember } = await import("../_shared/auth.ts");
      const membership = await requireFamilyMember(
        auth.userId,
        familyId,
        corsHeaders,
        ['family_head', 'family_admin'],
      );
      if (membership instanceof Response) return membership;

      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );


      const { data: family, error: familyError } = await supabaseClient
        .from("families")
        .select("name")
        .eq("id", familyId)
        .single();

      if (familyError) {
        console.error("Error fetching family:", familyError);
        throw new Error("Failed to fetch family details");
      }

      // Fetch all family members with their profiles (including phone)
      const { data: members, error: membersError } = await supabaseClient
        .from("family_members")
        .select("*, profiles:user_id(email, full_name, phone)")
        .eq("family_id", familyId);

      if (membersError) {
        console.error("Error fetching members:", membersError);
        throw new Error("Failed to fetch family members");
      }

      const emailRecipients = members
        .filter((m: any) => m.profiles?.email)
        .map((m: any) => ({
          email: m.profiles.email,
          name: m.profiles.full_name || "Family Member",
          phone: m.profiles.phone || null,
        }));

      // Send emails
      const emailPromises = emailRecipients.map((recipient: any) =>
        resend.emails.send({
          from: "Family Together <onboarding@resend.dev>",
          to: [recipient.email],
          subject: title || "New Meeting Scheduled",
          html: `
            <!DOCTYPE html>
            <html>
              <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                  <img src="https://31382291-0546-4a70-a015-b86eb65a55a3.lovableproject.com/logo.jpg" alt="Family Together" style="width: 60px; height: 60px; border-radius: 50%; margin-bottom: 16px; border: 3px solid rgba(255,255,255,0.3);" />
                  <h1 style="margin: 0;">New Meeting Scheduled</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">${family.name}</p>
                </div>
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                  <p>Hello ${recipient.name},</p>
                  <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                    <p style="margin: 0;">${message || "A new meeting has been scheduled for your family."}</p>
                  </div>
                  <p style="color: #666; font-size: 14px; margin-top: 20px;">Please check the app for full meeting details.</p>
                </div>
                <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                  <p>© ${new Date().getFullYear()} Family Together. All rights reserved.</p>
                </div>
              </body>
            </html>
          `,
        })
      );

      // Send WhatsApp messages to members with phone numbers
      const whatsappMessage = `📅 *${family.name} - New Meeting Scheduled*\n\n${message || "A new meeting has been scheduled."}\n\nPlease check the Family Together app for details.`;
      
      const whatsappPromises = emailRecipients
        .filter((r: any) => r.phone)
        .map((r: any) => sendWhatsAppMessage(r.phone, whatsappMessage));

      const [emailResults, whatsappResults] = await Promise.all([
        Promise.allSettled(emailPromises),
        Promise.allSettled(whatsappPromises),
      ]);

      const emailSuccess = emailResults.filter((r) => r.status === "fulfilled").length;
      const whatsappSuccess = whatsappResults.filter((r) => r.status === "fulfilled" && (r as any).value === true).length;

      console.log(`Meeting notifications: ${emailSuccess} emails, ${whatsappSuccess} WhatsApp messages sent`);

      return new Response(
        JSON.stringify({ success: true, emailsSent: emailSuccess, whatsappSent: whatsappSuccess }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { to, subject, userName, familyName, eventType, eventDetails, actionUrl } = requestData;

    if (!to || !subject) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to and subject" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const toArrayRaw = Array.isArray(to) ? to : [to];
    const normalizedTo = Array.from(new Set(
      toArrayRaw
        .filter((e): e is string => typeof e === "string" && e.length > 0)
        .map((e) => e.trim().toLowerCase())
    ));

    // Authorize recipients. To prevent authenticated users from using this
    // function as a generic email relay, restrict recipients to either:
    //   - the caller's own auth email (e.g. "send test email"), or
    //   - emails belonging to members of a family the caller belongs to
    //     (leader-only for bulk/general sends).
    // Internal cron jobs presenting a valid x-cron-secret bypass these checks.
    const { requireCronSecret, requireFamilyMember } = await import("../_shared/auth.ts");
    const cronCheck = await requireCronSecret(req, corsHeaders);
    const isCron = !(cronCheck instanceof Response);

    if (!isCron) {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );

      const { data: callerProfile } = await adminClient
        .from("profiles")
        .select("email")
        .eq("id", auth.userId)
        .maybeSingle();
      const callerEmail = (callerProfile?.email ?? "").toLowerCase();

      let allowedEmails = new Set<string>();
      if (callerEmail) allowedEmails.add(callerEmail);

      if (familyId) {
        // Bulk/family sends require caller to be a leader of that family.
        const membership = await requireFamilyMember(
          auth.userId,
          familyId,
          corsHeaders,
          ['family_head', 'family_admin', 'loan_committee'],
        );
        if (membership instanceof Response) return membership;

        const { data: famMembers } = await adminClient
          .from("family_members")
          .select("profiles:user_id(email)")
          .eq("family_id", familyId);
        for (const m of famMembers ?? []) {
          const em = (m as any)?.profiles?.email;
          if (em) allowedEmails.add(String(em).toLowerCase());
        }
      }

      const disallowed = normalizedTo.filter((e) => !allowedEmails.has(e));
      if (disallowed.length > 0) {
        return new Response(
          JSON.stringify({ error: "Recipients not permitted" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }


    const toArray = Array.isArray(to) ? to : [to];

    const emailHtml = userName && familyName && eventType && eventDetails ? `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${subject}</title></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <img src="https://31382291-0546-4a70-a015-b86eb65a55a3.lovableproject.com/logo.jpg" alt="Family Together" style="width: 60px; height: 60px; border-radius: 50%; margin-bottom: 16px; border: 3px solid rgba(255,255,255,0.3);" />
            <h1 style="margin: 0;">Family Together</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${familyName}</p>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p>Hello ${userName},</p>
            <div style="display: inline-block; background: #667eea; color: white; padding: 5px 15px; border-radius: 20px; font-size: 14px; margin-bottom: 15px;">${eventType}</div>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <p style="margin: 0;">${eventDetails}</p>
            </div>
            ${actionUrl ? `<center><a href="${actionUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin: 20px 0;">View Details</a></center>` : ''}
            <p style="color: #666; font-size: 14px; margin-top: 20px;">This is an automated notification from Family Together.</p>
          </div>
          <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p>© ${new Date().getFullYear()} Family Together. All rights reserved.</p>
          </div>
        </body>
      </html>
    ` : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">Family Together</h1>
        <div style="margin: 20px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
          ${message || 'Notification from Family Together'}
        </div>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">This is an automated notification from Family Together admin system.</p>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "Family Together <onboarding@resend.dev>",
      to: toArray,
      subject,
      html: emailHtml,
    });

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

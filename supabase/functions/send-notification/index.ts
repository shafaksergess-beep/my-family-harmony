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
  // For meeting_scheduled type
  familyId?: string;
  title?: string;
  data?: Record<string, any>;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting check
    const ipAddress = getIpAddress(req);
    const rateLimitCheck = checkRateLimit(ipAddress);
    
    if (rateLimitCheck.isBlocked) {
      const minutesBlocked = Math.ceil((rateLimitCheck.blockedUntil! - Date.now()) / 60000);
      return new Response(
        JSON.stringify({ 
          error: `Too many requests. Please try again in ${minutesBlocked} minute(s).` 
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Record the request for rate limiting
    recordRequest(ipAddress);
    
    const requestData: NotificationRequest = await req.json();
    const { type, familyId, title, message, data } = requestData;

    // Handle meeting_scheduled notification type
    if (type === 'meeting_scheduled' && familyId) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );

      // Fetch family details
      const { data: family, error: familyError } = await supabaseClient
        .from("families")
        .select("name")
        .eq("id", familyId)
        .single();

      if (familyError) {
        console.error("Error fetching family:", familyError);
        throw new Error("Failed to fetch family details");
      }

      // Fetch all family members with their profiles
      const { data: members, error: membersError } = await supabaseClient
        .from("family_members")
        .select("*, profiles:user_id(email, full_name)")
        .eq("family_id", familyId);

      if (membersError) {
        console.error("Error fetching members:", membersError);
        throw new Error("Failed to fetch family members");
      }

      // Filter members with valid emails
      const emailRecipients = members
        .filter((m: any) => m.profiles?.email)
        .map((m: any) => ({
          email: m.profiles.email,
          name: m.profiles.full_name || "Family Member"
        }));

      if (emailRecipients.length === 0) {
        console.log("No email recipients found for meeting notification");
        return new Response(JSON.stringify({ success: true, sent: 0 }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Send emails to all members
      const emailPromises = emailRecipients.map((recipient: any) =>
        resend.emails.send({
          from: "Family Together <onboarding@resend.dev>",
          to: [recipient.email],
          subject: title || "New Meeting Scheduled",
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                  <img src="https://31382291-0546-4a70-a015-b86eb65a55a3.lovableproject.com/logo.jpg" alt="Family Together" style="width: 60px; height: 60px; border-radius: 50%; margin-bottom: 16px; border: 3px solid rgba(255,255,255,0.3);" />
                  <h1 style="margin: 0;">New Meeting Scheduled</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">${family.name}</p>
                </div>
                
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                  <p>Hello ${recipient.name},</p>
                  
                  <div style="display: inline-block; background: #667eea; color: white; padding: 5px 15px; border-radius: 20px; font-size: 14px; margin-bottom: 15px;">
                    Meeting Notification
                  </div>
                  
                  <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                    <p style="margin: 0;">${message || "A new meeting has been scheduled for your family."}</p>
                  </div>
                  
                  <p style="color: #666; font-size: 14px; margin-top: 20px;">
                    Please check the app for full meeting details and add it to your calendar.
                  </p>
                </div>
                
                <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                  <p>© ${new Date().getFullYear()} Family Together. All rights reserved.</p>
                </div>
              </body>
            </html>
          `,
        })
      );

      const results = await Promise.allSettled(emailPromises);
      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const failureCount = results.filter((r) => r.status === "rejected").length;

      console.log(`Meeting notifications sent: ${successCount} successful, ${failureCount} failed`);

      return new Response(
        JSON.stringify({ success: true, sent: successCount, failed: failureCount }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Original notification handling for direct email sending
    const {
      to,
      subject,
      userName,
      familyName,
      eventType,
      eventDetails,
      actionUrl,
    } = requestData;

    if (!to || !subject) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to and subject" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Sending notification to:`, to);

    const toArray = Array.isArray(to) ? to : [to];

    // Use new format if provided
    const emailHtml = userName && familyName && eventType && eventDetails ? `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 10px 10px 0 0;
              text-align: center;
            }
            .content {
              background: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .event-badge {
              display: inline-block;
              background: #667eea;
              color: white;
              padding: 5px 15px;
              border-radius: 20px;
              font-size: 14px;
              margin-bottom: 15px;
            }
            .details {
              background: white;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #667eea;
            }
            .button {
              display: inline-block;
              background: #667eea;
              color: white;
              padding: 12px 30px;
              border-radius: 6px;
              text-decoration: none;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              color: #666;
              font-size: 12px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="https://31382291-0546-4a70-a015-b86eb65a55a3.lovableproject.com/logo.jpg" alt="Family Together" style="width: 60px; height: 60px; border-radius: 50%; margin-bottom: 16px; border: 3px solid rgba(255,255,255,0.3);" />
            <h1 style="margin: 0;">Family Together</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${familyName}</p>
          </div>
          
          <div class="content">
            <p>Hello ${userName},</p>
            
            <div class="event-badge">${eventType}</div>
            
            <div class="details">
              <p style="margin: 0;">${eventDetails}</p>
            </div>
            
            ${actionUrl ? `
              <center>
                <a href="${actionUrl}" class="button">View Details</a>
              </center>
            ` : ''}
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              This is an automated notification from your Family Together app. 
              You can manage your email preferences in the app settings.
            </p>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Family Together. All rights reserved.</p>
          </div>
        </body>
      </html>
    ` : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">
            Family Together
          </h1>
          <div style="margin: 20px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
            ${message || 'Notification from Family Together'}
          </div>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This is an automated notification from Family Together admin system.
          </p>
        </div>
      `;

    const emailResponse = await resend.emails.send({
      from: "Family Together <onboarding@resend.dev>",
      to: toArray,
      subject,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
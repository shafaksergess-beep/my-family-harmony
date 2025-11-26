import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  to: string | string[];
  subject: string;
  userName?: string;
  familyName?: string;
  eventType?: string;
  eventDetails?: string;
  actionUrl?: string;
  message?: string;
  type?: 'family_created' | 'member_added' | 'role_changed' | 'general';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      to,
      subject,
      userName,
      familyName,
      eventType,
      eventDetails,
      actionUrl,
      message,
      type,
    }: NotificationRequest = await req.json();

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

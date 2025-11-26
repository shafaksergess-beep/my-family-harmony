import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { checkRateLimit, recordRequest, getIpAddress } from "../_shared/rateLimiter.ts";
import { verifyRecaptchaToken } from "../_shared/recaptcha.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  invitationId: string;
  recaptchaToken?: string;
}

const handler = async (req: Request): Promise<Response> => {
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

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { invitationId, recaptchaToken }: InvitationRequest = await req.json();

    // Verify reCAPTCHA token if provided
    if (recaptchaToken) {
      const recaptchaResult = await verifyRecaptchaToken(recaptchaToken, "invite", 0.5);
      if (!recaptchaResult.success) {
        return new Response(
          JSON.stringify({ error: "Security verification failed. Please try again." }),
          {
            status: 403,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    }

    // Record the request for rate limiting
    recordRequest(ipAddress);

    // Fetch invitation details
    const { data: invitation, error: invError } = await supabaseClient
      .from("invitations")
      .select(`
        *,
        families:family_id(name),
        profiles:invited_by(full_name)
      `)
      .eq("id", invitationId)
      .single();

    if (invError || !invitation) {
      throw new Error("Invitation not found");
    }

    const familyName = invitation.families?.name || "the family";
    const inviterName = invitation.profiles?.full_name || "A family member";
    const acceptUrl = `${Deno.env.get("SUPABASE_URL")?.replace("/v1", "")}/accept-invitation?token=${invitation.token}`;

    const emailResponse = await resend.emails.send({
      from: "Family Together <onboarding@resend.dev>",
      to: [invitation.email],
      subject: `You're invited to join ${familyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px 10px 0 0;">
            <img src="https://31382291-0546-4a70-a015-b86eb65a55a3.lovableproject.com/logo.jpg" alt="Family Together" style="width: 70px; height: 70px; border-radius: 50%; margin-bottom: 16px; border: 3px solid rgba(255,255,255,0.3);" />
            <h1 style="color: white; margin: 0;">You're Invited!</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <p>Hello,</p>
            <p><strong>${inviterName}</strong> has invited you to join <strong>${familyName}</strong> on Family Together.</p>
            <p>Your role will be: <strong>${invitation.role.replace("_", " ").toUpperCase()}</strong></p>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${acceptUrl}" style="background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Accept Invitation
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">This invitation will expire on ${new Date(invitation.expires_at).toLocaleDateString()}.</p>
            <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px; border-top: 1px solid #ddd;">
            © ${new Date().getFullYear()} Family Together. All rights reserved.
          </div>
        </div>
      `,
    });

    console.log("Invitation email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending invitation:", error);
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

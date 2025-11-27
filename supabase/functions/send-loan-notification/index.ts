import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  loanId: string;
  familyId: string;
  memberName: string;
  amount: number;
  purpose: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { loanId, familyId, memberName, amount, purpose }: NotificationRequest = await req.json();

    console.log('Processing loan notification:', { loanId, familyId, memberName, amount, purpose });

    // Get loan committee members and family head
    const { data: members, error: membersError } = await supabase
      .from('family_members')
      .select('user_id, role, profiles:user_id(email, full_name)')
      .eq('family_id', familyId)
      .in('role', ['family_head', 'loan_committee']);

    if (membersError) {
      console.error('Error fetching members:', membersError);
      throw membersError;
    }

    console.log('Found members to notify:', members?.length);

    // Get family details
    const { data: family, error: familyError } = await supabase
      .from('families')
      .select('name, slug')
      .eq('id', familyId)
      .single();

    if (familyError) {
      console.error('Error fetching family:', familyError);
      throw familyError;
    }

    // Send email notifications to loan committee and family head
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not configured, skipping email notifications');
    } else {
      for (const member of members || []) {
        const profile = member.profiles as any;
        if (profile?.email) {
          const emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">New Loan Request</h2>
              <p>A new loan request has been submitted in <strong>${family.name}</strong>.</p>
              
              <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Requested by:</strong> ${memberName}</p>
                <p><strong>Amount:</strong> ${amount.toLocaleString()} FCFA</p>
                <p><strong>Purpose:</strong> ${purpose}</p>
              </div>
              
              <p>Please review this loan request in the loan committee dashboard.</p>
              
              <a href="${supabaseUrl.replace('https://', 'https://app.')}/family/${family.slug}/loan-committee" 
                 style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
                Review Loan Request
              </a>
              
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                This is an automated notification from Family Together.
              </p>
            </div>
          `;

          try {
            const emailResponse = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'Family Together <notifications@familytogether.app>',
                to: [profile.email],
                subject: `New Loan Request: ${amount.toLocaleString()} FCFA`,
                html: emailBody,
              }),
            });

            if (!emailResponse.ok) {
              console.error('Failed to send email:', await emailResponse.text());
            } else {
              console.log('Email sent successfully to:', profile.email);
            }
          } catch (emailError) {
            console.error('Error sending email:', emailError);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notifications sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-loan-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

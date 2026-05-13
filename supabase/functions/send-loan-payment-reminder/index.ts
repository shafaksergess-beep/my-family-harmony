import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const envSecret = Deno.env.get('CRON_SECRET') ?? '';
    const authHeader = req.headers.get('authorization') ?? '';
    const xHeader = req.headers.get('x-cron-secret') ?? '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    let authorized =
      (envSecret && (authHeader === `Bearer ${envSecret}` || xHeader === envSecret));
    if (!authorized) {
      const candidate = xHeader || bearer;
      if (candidate) {
        try {
          const { data } = await supabase.rpc('verify_cron_secret', { provided: candidate });
          authorized = data === true;
        } catch (e) { console.error('verify_cron_secret rpc failed', e); }
      }
    }
    if (!authorized) {
      return new Response('Unauthorized', { status: 401 });
    }

    console.log('Starting loan payment reminder check...');

    // Get all loans with outstanding balances
    const { data: loans, error: loansError } = await supabase
      .from('loans')
      .select(`
        *,
        family_members(
          user_id,
          family_id,
          profiles:user_id(full_name, email, phone)
        ),
        families(name, slug)
      `)
      .in('status', ['approved', 'disbursed']);

    if (loansError) {
      console.error('Error fetching loans:', loansError);
      throw loansError;
    }

    console.log(`Found ${loans?.length || 0} active loans to check`);

    const now = new Date();
    const currentYear = now.getFullYear();
    const deadline = new Date(currentYear, 10, 30); // November 30
    const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let remindersSent = 0;

    for (const loan of loans || []) {
      const totalInterest = (loan.amount * loan.interest_rate * loan.term_months) / 100;
      const totalOwed = loan.amount + totalInterest;
      const totalPaid = (loan.amount_paid || 0) + (loan.interest_paid || 0);
      const outstanding = totalOwed - totalPaid;

      // Skip if loan is fully paid
      if (outstanding <= 0) continue;

      const member = loan.family_members as any;
      const profile = member?.profiles;
      const family = loan.families as any;

      if (!profile?.email) continue;

      // Determine urgency level
      let urgencyLevel = 'normal';
      let subject = 'Monthly Loan Payment Reminder';
      
      if (daysUntilDeadline < 0) {
        urgencyLevel = 'overdue';
        subject = '🚨 URGENT: Loan Payment Overdue';
      } else if (daysUntilDeadline < 30) {
        urgencyLevel = 'urgent';
        subject = '⚠️ Loan Payment Deadline Approaching';
      }

      // Send email reminder
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      if (resendApiKey) {
        const emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Loan Payment Reminder</h2>
            <p>Dear ${profile.full_name},</p>
            
            <p>This is a reminder about your outstanding loan in <strong>${family.name}</strong>.</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Loan Details:</h3>
              <p><strong>Purpose:</strong> ${loan.purpose}</p>
              <p><strong>Original Amount:</strong> ${loan.amount.toLocaleString()} FCFA</p>
              <p><strong>Interest Rate:</strong> ${loan.interest_rate}% per month</p>
              <p><strong>Term:</strong> ${loan.term_months} months</p>
              <hr style="border: 1px solid #ddd; margin: 15px 0;">
              <p><strong>Total Owed:</strong> ${totalOwed.toLocaleString()} FCFA</p>
              <p><strong>Amount Paid:</strong> ${totalPaid.toLocaleString()} FCFA</p>
              <p style="font-size: 18px; color: #d97706;"><strong>Outstanding Balance:</strong> ${outstanding.toLocaleString()} FCFA</p>
            </div>
            
            ${urgencyLevel === 'overdue' ? `
              <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                <p style="color: #dc2626; font-weight: bold; margin: 0;">⚠️ OVERDUE</p>
                <p style="margin: 10px 0 0 0;">Your loan payment is past the November 30 deadline. Please make arrangements to clear this balance as soon as possible. Unpaid loans may be recovered from your Njangi or assistance payments.</p>
              </div>
            ` : urgencyLevel === 'urgent' ? `
              <div style="background: #fef3c7; border-left: 4px solid #d97706; padding: 15px; margin: 20px 0;">
                <p style="color: #d97706; font-weight: bold; margin: 0;">⏰ Deadline Approaching</p>
                <p style="margin: 10px 0 0 0;">You have ${daysUntilDeadline} days remaining until the November 30 deadline. Please ensure your loan is cleared by this date.</p>
              </div>
            ` : `
              <div style="background: #dbeafe; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
                <p style="color: #2563eb; margin: 0;"><strong>Reminder:</strong> All loans must be cleared by November 30, ${currentYear}. You have ${daysUntilDeadline} days remaining.</p>
              </div>
            `}
            
            <p>You can make a payment by contacting the family treasurer or through the family portal.</p>
            
            <a href="${supabaseUrl.replace('https://', 'https://app.')}/family/${family.slug}/loans" 
               style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
              View Loan Details
            </a>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              This is an automated reminder from Family Together. If you have questions, please contact your family head or treasurer.
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
              subject: subject,
              html: emailBody,
            }),
          });

          if (emailResponse.ok) {
            console.log(`Email reminder sent to ${profile.email} for loan ${loan.id}`);
            remindersSent++;
          } else {
            console.error('Failed to send email:', await emailResponse.text());
          }
        } catch (emailError) {
          console.error('Error sending email:', emailError);
        }
      }

      // Send SMS reminder if phone number available
      if (profile.phone) {
        const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
        const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
        const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

        if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
          const smsBody = urgencyLevel === 'overdue'
            ? `🚨 URGENT: Your loan of ${outstanding.toLocaleString()} FCFA in ${family.name} is OVERDUE. Please pay immediately to avoid deductions from benefits.`
            : urgencyLevel === 'urgent'
            ? `⚠️ Reminder: ${daysUntilDeadline} days left to pay your loan of ${outstanding.toLocaleString()} FCFA in ${family.name}. Deadline: Nov 30.`
            : `Loan Reminder: You have ${outstanding.toLocaleString()} FCFA outstanding in ${family.name}. Deadline: Nov 30, ${currentYear}.`;

          try {
            const smsResponse = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                  To: profile.phone,
                  From: twilioPhoneNumber,
                  Body: smsBody,
                }).toString(),
              }
            );

            if (smsResponse.ok) {
              console.log(`SMS reminder sent to ${profile.phone} for loan ${loan.id}`);
            } else {
              console.error('Failed to send SMS:', await smsResponse.text());
            }
          } catch (smsError) {
            console.error('Error sending SMS:', smsError);
          }
        }
      }
    }

    console.log(`Loan payment reminders completed. Sent ${remindersSent} reminders.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${remindersSent} loan payment reminders`,
        loansChecked: loans?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-loan-payment-reminder:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

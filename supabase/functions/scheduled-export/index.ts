import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting scheduled export job...');

    // Get all active schedules
    const { data: schedules, error: schedulesError } = await supabase
      .from('export_schedules')
      .select('*')
      .eq('is_active', true);

    if (schedulesError) throw schedulesError;

    if (!schedules || schedules.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active schedules found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const results = [];

    for (const schedule of schedules) {
      try {
        console.log(`Processing schedule: ${schedule.name}`);

        // Generate report based on type
        const reportData = await generateReport(supabase, schedule.family_id, schedule.report_type);

        if (!reportData) {
          console.log(`No data for schedule: ${schedule.name}`);
          continue;
        }

        // Convert to CSV
        const csvContent = convertToCSV(reportData);

        // Send email with attachment via Resend
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Family Together <reports@familytogether.app>',
            to: schedule.recipients,
            subject: `${schedule.name} - Automated Report`,
            html: `
              <h2>${schedule.name}</h2>
              <p>Please find your scheduled ${schedule.report_type.replace('_', ' ')} report attached.</p>
              <p>This report was generated automatically on ${new Date().toLocaleDateString()}.</p>
            `,
            attachments: [
              {
                filename: `${schedule.report_type}_${new Date().toISOString().split('T')[0]}.csv`,
                content: btoa(csvContent),
              },
            ],
          }),
        });

        if (!emailResponse.ok) {
          console.error('Failed to send email:', await emailResponse.text());
          results.push({ schedule: schedule.name, status: 'failed' });
        } else {
          console.log(`Report sent for schedule: ${schedule.name}`);

          // Update last_sent_at
          await supabase
            .from('export_schedules')
            .update({ last_sent_at: new Date().toISOString() })
            .eq('id', schedule.id);

          results.push({ schedule: schedule.name, status: 'sent' });
        }
      } catch (error) {
        console.error(`Error processing schedule ${schedule.name}:`, error);
        results.push({ schedule: schedule.name, status: 'error', error: String(error) });
      }
    }

    return new Response(
      JSON.stringify({ message: 'Export job completed', results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function generateReport(supabase: any, familyId: string, reportType: string) {
  switch (reportType) {
    case 'contributions':
      return await supabase
        .from('contributions')
        .select('*, family_members(profiles(full_name))')
        .eq('family_id', familyId);

    case 'loans':
      return await supabase
        .from('loans')
        .select('*, family_members(profiles(full_name))')
        .eq('family_id', familyId);

    case 'savings':
      return await supabase
        .from('savings')
        .select('*, family_members(profiles(full_name))')
        .eq('family_id', familyId);

    case 'attendance':
      return await supabase
        .from('attendance')
        .select('*, family_members(profiles(full_name)), meetings(*)')
        .eq('meetings.family_id', familyId);

    case 'financial_summary':
      // Aggregate financial data
      const [contributions, loans, savings] = await Promise.all([
        supabase.from('contributions').select('amount, status').eq('family_id', familyId),
        supabase.from('loans').select('amount, amount_paid, status').eq('family_id', familyId),
        supabase.from('savings').select('amount').eq('family_id', familyId),
      ]);

      return {
        data: [
          {
            report_type: 'Financial Summary',
            total_contributions: contributions.data?.reduce((sum: number, c: any) => sum + parseFloat(c.amount), 0) || 0,
            paid_contributions: contributions.data?.filter((c: any) => c.status === 'paid').reduce((sum: number, c: any) => sum + parseFloat(c.amount), 0) || 0,
            total_loans: loans.data?.reduce((sum: number, l: any) => sum + parseFloat(l.amount), 0) || 0,
            loans_outstanding: loans.data?.reduce((sum: number, l: any) => sum + (parseFloat(l.amount) - parseFloat(l.amount_paid || 0)), 0) || 0,
            total_savings: savings.data?.reduce((sum: number, s: any) => sum + parseFloat(s.amount), 0) || 0,
            generated_at: new Date().toISOString(),
          },
        ],
      };

    default:
      return null;
  }
}

function convertToCSV(data: any): string {
  if (!data.data || data.data.length === 0) return '';

  const rows = data.data;
  const headers = Object.keys(rows[0]);

  const csvRows = [
    headers.join(','),
    ...rows.map((row: any) =>
      headers.map(header => {
        const value = row[header];
        if (typeof value === 'object' && value !== null) {
          return JSON.stringify(value).replace(/,/g, ';');
        }
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    ),
  ];

  return csvRows.join('\n');
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { requireAuth, requireFamilyMember } = await import("../_shared/auth.ts");
  const auth = await requireAuth(req, corsHeaders);
  if (auth instanceof Response) return auth;

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { meetingId } = await req.json();

    if (!meetingId) {
      return new Response(
        JSON.stringify({ error: 'Meeting ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get meeting details
    const { data: meeting, error: meetingError } = await supabaseClient
      .from('meetings')
      .select('*, families(name)')
      .eq('id', meetingId)
      .single();

    if (meetingError || !meeting) {
      throw new Error('Meeting not found');
    }

    // Only family leaders may trigger attendance-prediction outreach for a family
    const membership = await requireFamilyMember(
      auth.userId,
      meeting.family_id,
      corsHeaders,
      ['family_head', 'family_admin'],
    );
    if (membership instanceof Response) return membership;


    // Get all family members
    const { data: members, error: membersError } = await supabaseClient
      .from('family_members')
      .select('id, user_id, profiles(full_name, email)')
      .eq('family_id', meeting.family_id);

    if (membersError) throw membersError;

    const unlikelyMembers = [];

    // Calculate attendance predictions for each member
    for (const member of members || []) {
      const { data: attendanceRecords } = await supabaseClient
        .from('attendance')
        .select('status')
        .eq('member_id', member.id);

      const totalMeetings = attendanceRecords?.length || 0;
      const presentCount = attendanceRecords?.filter(
        (r) => r.status === 'present' || r.status === 'late'
      ).length || 0;

      const attendanceRate = totalMeetings > 0 ? (presentCount / totalMeetings) * 100 : 50;

      // If attendance rate is below 40%, mark as unlikely
      if (attendanceRate < 40) {
        unlikelyMembers.push({
          member_id: member.id,
          user_id: member.user_id,
          name: (member.profiles as any)?.full_name || 'Member',
          email: (member.profiles as any)?.email,
          attendance_rate: Math.round(attendanceRate),
        });
      }
    }

    console.log(`Found ${unlikelyMembers.length} unlikely attendees`);

    // Send notifications to unlikely members
    for (const member of unlikelyMembers) {
      // Create in-app notification
      await supabaseClient.from('activity_logs').insert({
        user_id: member.user_id,
        family_id: meeting.family_id,
        action_type: 'notification',
        entity_type: 'meeting',
        entity_id: meetingId,
        details: {
          type: 'attendance_prediction',
          message: `Based on your attendance history (${member.attendance_rate}% attendance rate), we're concerned you might miss the upcoming meeting on ${new Date(meeting.meeting_date).toLocaleDateString()}. Please confirm your attendance!`,
          meeting_date: meeting.meeting_date,
          meeting_time: meeting.meeting_time,
        },
      });

      // Send email notification directly via Resend if email exists
      if (member.email) {
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        if (resendApiKey) {
          try {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'Family Together <onboarding@resend.dev>',
                to: [member.email],
                subject: `Attendance Reminder: ${(meeting.families as any)?.name} Meeting`,
                html: `
                  <h2>Meeting Attendance Reminder</h2>
                  <p>Hi ${member.name},</p>
                  <p>We noticed your attendance rate is currently at ${member.attendance_rate}%.</p>
                  <p>We'd love to see you at our upcoming meeting:</p>
                  <ul>
                    <li><strong>Date:</strong> ${new Date(meeting.meeting_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</li>
                    <li><strong>Time:</strong> ${meeting.meeting_time}</li>
                    ${meeting.location ? `<li><strong>Location:</strong> ${meeting.location}</li>` : ''}
                  </ul>
                  <p>Please let us know if you can attend. Your participation is important to us!</p>
                  <p>Best regards,<br>${(meeting.families as any)?.name}</p>
                `,
              }),
            });
          } catch (e) { console.error('resend send failed', e); }
        }
      }

    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notified: unlikelyMembers.length,
        members: unlikelyMembers 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

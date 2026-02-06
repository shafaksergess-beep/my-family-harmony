import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

interface FamilyEvent {
  id: string;
  family_id: string;
  title: string;
  event_date: string;
  event_type: string;
  reminder_days: number[];
  member?: {
    profiles: {
      full_name: string;
      email: string;
    };
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify cron secret
    const cronSecret = req.headers.get('x-cron-secret');
    if (cronSecret !== Deno.env.get('CRON_SECRET')) {
      console.error('Invalid cron secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking for upcoming family events...');

    // Get all active events with reminder days
    const { data: events, error: eventsError } = await supabase
      .from('family_events')
      .select(`
        id,
        family_id,
        title,
        event_date,
        event_type,
        reminder_days,
        member:family_members(
          profiles(full_name, email)
        )
      `)
      .eq('is_active', true);

    if (eventsError) {
      throw eventsError;
    }

    console.log(`Found ${events?.length || 0} active events`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const remindersToSend: Array<{
      event: FamilyEvent;
      daysUntil: number;
    }> = [];

    // Check each event for reminders
    for (const event of (events || []) as FamilyEvent[]) {
      const eventDate = new Date(event.event_date);
      eventDate.setHours(0, 0, 0, 0);

      const diffTime = eventDate.getTime() - today.getTime();
      const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Check if we should send a reminder for this event
      if (daysUntil > 0 && event.reminder_days?.includes(daysUntil)) {
        // Check if we already sent this reminder
        const { data: existingReminder } = await supabase
          .from('event_reminders')
          .select('id')
          .eq('event_id', event.id)
          .eq('days_before', daysUntil)
          .gte('sent_at', new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString())
          .single();

        if (!existingReminder) {
          remindersToSend.push({ event, daysUntil });
        }
      }
    }

    console.log(`Sending ${remindersToSend.length} reminders`);

    // Send notifications for each reminder
    for (const { event, daysUntil } of remindersToSend) {
      // Get all family members to notify
      const { data: members } = await supabase
        .from('family_members')
        .select('user_id, profiles(full_name, email)')
        .eq('family_id', event.family_id);

      const eventTypeEmoji = {
        birthday: '🎂',
        anniversary: '💑',
        meeting: '📅',
        reminder: '⏰',
        custom: '📌',
      }[event.event_type] || '📅';

      const daysText = daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`;
      const subject = `${eventTypeEmoji} ${event.title} is ${daysText}`;
      const message = `Don't forget: ${event.title} is coming up ${daysText}!`;

      console.log(`Sending reminder for event: ${event.title} (${daysUntil} days)`);

      // Record the reminder as sent
      await supabase.from('event_reminders').insert({
        event_id: event.id,
        family_id: event.family_id,
        days_before: daysUntil,
        reminder_type: 'push',
      });

      // Send push notifications via send-notification edge function
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'event_reminder',
            familyId: event.family_id,
            title: subject,
            message: message,
            data: {
              eventId: event.id,
              eventType: event.event_type,
              eventDate: event.event_date,
            },
          },
        });
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        remindersProcessed: remindersToSend.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in send-event-reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { FamilyCalendar } from '@/components/calendar';
import { Card, CardContent } from '@/components/ui/card';
import SEO from "@/components/SEO";

export default function Calendar() {
  const { familySlug } = useParams();

  // Get current user
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  // Get family data
  const { data: family, isLoading: familyLoading } = useQuery({
    queryKey: ['family', familySlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('families')
        .select('*')
        .eq('slug', familySlug)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!familySlug,
  });

  // Get current member
  const { data: member, isLoading: memberLoading } = useQuery({
    queryKey: ['family-member', family?.id, session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('family_members')
        .select('*, profiles(full_name, avatar_url)')
        .eq('family_id', family!.id)
        .eq('user_id', session!.user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!family?.id && !!session?.user?.id,
  });

  // Get all family members for event form
  const { data: members = [] } = useQuery({
    queryKey: ['family-members', family?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('family_members')
        .select('id, profiles(full_name)')
        .eq('family_id', family!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!family?.id,
  });

  // Get meetings for calendar overlay
  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings', family?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select('id, meeting_date, meeting_type, meeting_time, host_house')
        .eq('family_id', family!.id)
        .order('meeting_date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!family?.id,
  });

  if (familyLoading || memberLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!family || !member || !session) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Unable to load calendar. Please try again.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <SEO title="Family Calendar" description="Birthdays, anniversaries, meetings and recurring events for your family." />
      <div className="container max-w-6xl mx-auto py-6 px-4">
      <div className="flex items-center gap-3 mb-6">
        <CalendarDays className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Family Calendar</h1>
          <p className="text-muted-foreground">
            Track birthdays, anniversaries, meetings, and family events
          </p>
        </div>
      </div>

      <FamilyCalendar
        familyId={family.id}
        memberId={member.id}
        members={members}
        meetings={meetings}
      />
    </div>
    </>
  );
}

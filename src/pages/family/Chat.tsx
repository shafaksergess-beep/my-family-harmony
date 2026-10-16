import { useTranslation } from "react-i18next";
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, Calendar, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { FamilyChat } from '@/components/chat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import SEO from "@/components/SEO";

export default function Chat() {
  const { t } = useTranslation();
  const { familySlug } = useParams();
  const isMobile = useIsMobile();

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

  // Get meetings for context
  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings', family?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select('id, meeting_date, meeting_type')
        .eq('family_id', family!.id)
        .eq('is_completed', false)
        .order('meeting_date', { ascending: true })
        .limit(10);
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
          {t("famChat.unableToLoadChatPlease")}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <SEO title={t("famChat.familyChat")} description={t("famChat.realTimeConversationsBetweenFamily")} />
      <div className="container max-w-4xl mx-auto py-6 px-4">
      <div className="flex items-center gap-3 mb-6">
        <MessageCircle className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{t("famChat.familyChat")}</h1>
          <p className="text-muted-foreground">
            {t("famChat.discussMeetingsEventsAndFamily")}
          </p>
        </div>
      </div>

      <FamilyChat
        familyId={family.id}
        memberId={member.id}
        currentUserId={session.user.id}
        meetings={meetings}
        className="min-h-[500px]"
      />

      {/* Quick Tips */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t("famChat.linkMessagesToMeetings")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("famChat.clickTheCalendarIconIn")}
          </p>
        </CardContent>
      </Card>
    </div>
    </>
  );
}

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { Loader2, ArrowLeft, Calendar, Clock, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MeetingAgendaBuilder } from "@/components/MeetingAgendaBuilder";
import { MeetingMinutes } from "@/components/MeetingMinutes";

interface Meeting {
  id: string;
  meeting_date: string;
  meeting_time: string;
  meeting_type: string;
  location: string | null;
  host_house: string | null;
  agenda: string | null;
  is_completed: boolean;
}

const MeetingDetail = () => {
  const { familySlug, meetingId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { family, isFamilyHead, isLoading: authLoading } = useFamilyAuth(familySlug);
  const [loading, setLoading] = useState(true);
  const [meeting, setMeeting] = useState<Meeting | null>(null);

  useEffect(() => {
    if (family && meetingId) {
      loadMeeting();
    }
  }, [family, meetingId]);

  const loadMeeting = async () => {
    if (!family || !meetingId) return;

    try {
      const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .eq("id", meetingId)
        .eq("family_id", family.id)
        .single();

      if (error) throw error;
      setMeeting(data);
    } catch (error: any) {
      console.error("Error loading meeting:", error);
      toast({
        title: "Error",
        description: "Failed to load meeting details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p>Meeting not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(`/family/${familySlug}/meetings`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">Meeting Details</h1>
              <p className="text-sm text-muted-foreground">{family?.name}</p>
            </div>
            <Badge variant={meeting.is_completed ? "secondary" : "default"}>
              {meeting.is_completed ? "Completed" : "Upcoming"}
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Meeting Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Meeting Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {new Date(meeting.meeting_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-medium">{meeting.meeting_time}</p>
                </div>
              </div>

              {meeting.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{meeting.location}</p>
                  </div>
                </div>
              )}

              {meeting.host_house && (
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Host House</p>
                    <p className="font-medium">{meeting.host_house}</p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <Badge variant="outline" className="capitalize">
                {meeting.meeting_type}
              </Badge>
            </div>

            {meeting.agenda && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Initial Agenda</p>
                <p className="text-sm">{meeting.agenda}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs for Agenda and Minutes */}
        <Tabs defaultValue="agenda" className="space-y-6">
          <TabsList>
            <TabsTrigger value="agenda">Agenda Builder</TabsTrigger>
            <TabsTrigger value="minutes">Meeting Minutes</TabsTrigger>
          </TabsList>

          <TabsContent value="agenda">
            <MeetingAgendaBuilder meetingId={meeting.id} canEdit={isFamilyHead} />
          </TabsContent>

          <TabsContent value="minutes">
            <MeetingMinutes meetingId={meeting.id} canEdit={isFamilyHead} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default MeetingDetail;

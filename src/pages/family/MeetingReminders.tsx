import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Bell, Mail, MessageSquare, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Meeting {
  id: string;
  meeting_date: string;
  meeting_time: string;
  location: string;
  agenda: string;
}

interface Reminder {
  id: string;
  meeting_id: string;
  reminder_type: string;
  days_before: number;
  sent_at: string;
}

const MeetingReminders = () => {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { family, isFamilyHead, isLoading } = useFamilyAuth(familySlug);
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (family) {
      loadData();
    }
  }, [family]);

  const loadData = async () => {
    if (!family) return;

    try {
      // Load upcoming meetings
      const today = new Date().toISOString().split("T")[0];
      const { data: meetingsData, error: meetingsError } = await supabase
        .from("meetings")
        .select("*")
        .eq("family_id", family.id)
        .gte("meeting_date", today)
        .eq("is_completed", false)
        .order("meeting_date", { ascending: true });

      if (meetingsError) throw meetingsError;
      setMeetings(meetingsData || []);

      // Load reminders
      const { data: remindersData, error: remindersError } = await supabase
        .from("meeting_reminders")
        .select("*")
        .eq("family_id", family.id)
        .order("sent_at", { ascending: false });

      if (remindersError) throw remindersError;
      setReminders(remindersData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load meeting reminders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendReminder = async (meetingId: string, type: "email" | "sms") => {
    if (!family) return;

    setSending({ ...sending, [`${meetingId}-${type}`]: true });
    try {
      if (type === "email") {
        const { error } = await supabase.functions.invoke("send-meeting-reminder", {
          body: { meetingId, familyId: family.id },
        });

        if (error) throw error;
      } else {
        // SMS implementation would go here
        toast({
          title: "Coming Soon",
          description: "SMS reminders will be available soon",
        });
        return;
      }

      toast({
        title: "Reminder Sent",
        description: `${type.toUpperCase()} reminder sent successfully`,
      });

      loadData();
    } catch (error: any) {
      console.error("Error sending reminder:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send reminder",
        variant: "destructive",
      });
    } finally {
      setSending({ ...sending, [`${meetingId}-${type}`]: false });
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isFamilyHead) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Only family heads can manage meeting reminders</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(`/family/${familySlug}`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Meeting Reminders</h1>
              <p className="text-sm text-muted-foreground">Send reminders for upcoming meetings</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList>
            <TabsTrigger value="upcoming">
              <Calendar className="w-4 h-4 mr-2" />
              Upcoming Meetings
            </TabsTrigger>
            <TabsTrigger value="history">
              <Bell className="w-4 h-4 mr-2" />
              Reminder History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {meetings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No upcoming meetings</p>
                </CardContent>
              </Card>
            ) : (
              meetings.map((meeting) => {
                const meetingDate = new Date(meeting.meeting_date);
                const daysUntil = Math.ceil(
                  (meetingDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                );

                return (
                  <Card key={meeting.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {meetingDate.toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </CardTitle>
                          <CardDescription>
                            {meeting.meeting_time} • {daysUntil} days away
                          </CardDescription>
                        </div>
                        <Badge variant={daysUntil <= 3 ? "destructive" : "secondary"}>
                          {daysUntil === 0 ? "Today" : `In ${daysUntil} days`}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {meeting.location && (
                        <p className="text-sm text-muted-foreground mb-2">
                          Location: {meeting.location}
                        </p>
                      )}
                      {meeting.agenda && (
                        <p className="text-sm text-muted-foreground mb-4">Agenda: {meeting.agenda}</p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => sendReminder(meeting.id, "email")}
                          disabled={sending[`${meeting.id}-email`]}
                        >
                          {sending[`${meeting.id}-email`] ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Mail className="w-4 h-4 mr-2" />
                              Send Email
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => sendReminder(meeting.id, "sms")}
                          disabled={sending[`${meeting.id}-sms`]}
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Send SMS
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {reminders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No reminders sent yet</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {reminders.map((reminder) => (
                      <div
                        key={reminder.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">
                            {reminder.reminder_type.toUpperCase()} Reminder
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Sent {reminder.days_before} days before meeting
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(reminder.sent_at).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant="outline">Sent</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default MeetingReminders;

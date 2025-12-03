import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { useToast } from "@/hooks/use-toast";
import { isAfter, isBefore, isToday, parseISO, startOfDay } from "date-fns";
import { 
  MobileLayout, 
  PullToRefresh, 
  SkeletonCard, 
  OfflineIndicator 
} from "@/components/mobile";
import { MeetingCard } from "./MeetingCard";
import { MobileQRScanner } from "./MobileQRScanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  QrCode, 
  Clock,
  MapPin,
  CheckCircle,
  Users
} from "lucide-react";
import { haptics } from "@/lib/haptics";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

interface Meeting {
  id: string;
  meeting_date: string;
  meeting_time: string;
  meeting_type: string;
  location: string | null;
  host_house: string | null;
  is_completed: boolean;
  agenda: string | null;
  attendeeCount?: number;
}

interface AttendanceRecord {
  meeting_id: string;
}

export function MobileMeetings() {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { family, userId, isLoading: authLoading } = useFamilyAuth(familySlug);
  const isOnline = useOnlineStatus();
  
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [myAttendance, setMyAttendance] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [scannerSheetOpen, setScannerSheetOpen] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);

  const fetchMeetings = async () => {
    if (!family) return;
    
    try {
      // Get current user's member ID
      const { data: memberData } = await supabase
        .from("family_members")
        .select("id")
        .eq("family_id", family.id)
        .eq("user_id", userId)
        .single();

      if (memberData) {
        setCurrentMemberId(memberData.id);

        // Get user's attendance records
        const { data: attendanceData } = await supabase
          .from("attendance")
          .select("meeting_id")
          .eq("member_id", memberData.id);

        setMyAttendance(attendanceData?.map(a => a.meeting_id) || []);
      }

      // Fetch all meetings with attendance count
      const { data: meetingsData, error } = await supabase
        .from("meetings")
        .select(`
          *,
          attendance(count)
        `)
        .eq("family_id", family.id)
        .order("meeting_date", { ascending: false });

      if (error) throw error;

      const enrichedMeetings = meetingsData?.map(m => ({
        ...m,
        attendeeCount: m.attendance?.[0]?.count || 0
      })) || [];

      setMeetings(enrichedMeetings);
    } catch (error: any) {
      console.error("Error fetching meetings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load meetings",
      });
    } finally {
      setLoading(false);
    }
  };

  const { isRefreshing, pullDistance, handlers } = usePullToRefresh({ 
    onRefresh: fetchMeetings 
  });

  useEffect(() => {
    if (family && userId) {
      fetchMeetings();
    }
  }, [family, userId]);

  const handleCheckIn = async (meetingId: string) => {
    setSelectedMeetingId(meetingId);
    setScannerSheetOpen(true);
  };

  const handleQRScan = async (data: any) => {
    setScannerSheetOpen(false);
    
    try {
      if (!currentMemberId || !family) {
        throw new Error("Not authenticated");
      }

      const meeting = meetings.find(m => m.id === data.meetingId);
      if (!meeting) {
        throw new Error("Meeting not found");
      }

      const checkInTime = new Date();
      const meetingDateTime = new Date(`${meeting.meeting_date}T${meeting.meeting_time}`);
      const latenessMinutes = Math.max(0, Math.floor((checkInTime.getTime() - meetingDateTime.getTime()) / 60000));
      
      // Get family fine configuration
      const toleranceMinutes = family.lateness_tolerance_minutes || 30;
      const fine30 = family.fine_after_30min || 500;
      const fine60 = family.fine_after_60min || 1000;
      
      let fineAmount = 0;
      if (latenessMinutes > toleranceMinutes && latenessMinutes <= 60) {
        fineAmount = fine30;
      } else if (latenessMinutes > 60) {
        fineAmount = fine60;
      }

      const { error } = await supabase
        .from("attendance")
        .insert({
          meeting_id: data.meetingId,
          member_id: currentMemberId,
          status: latenessMinutes > toleranceMinutes ? 'late' : 'present',
          check_in_time: checkInTime.toISOString(),
          lateness_minutes: latenessMinutes,
          fine_amount: fineAmount,
        });

      if (error) throw error;

      haptics.success();
      toast({
        title: "Checked In!",
        description: latenessMinutes > toleranceMinutes
          ? `${latenessMinutes} min late. Fine: ${fineAmount} FCFA`
          : "You're on time!",
      });

      fetchMeetings();
    } catch (error: any) {
      haptics.error();
      toast({
        variant: "destructive",
        title: "Check-in Failed",
        description: error.message,
      });
    }
  };

  const handleViewMeeting = (meetingId: string) => {
    navigate(`/family/${familySlug}/meetings/${meetingId}/check-in`);
  };

  // Filter meetings
  const today = startOfDay(new Date());
  const upcomingMeetings = meetings.filter(m => {
    const meetingDate = parseISO(m.meeting_date);
    return isAfter(meetingDate, today) || isToday(meetingDate);
  }).sort((a, b) => parseISO(a.meeting_date).getTime() - parseISO(b.meeting_date).getTime());

  const pastMeetings = meetings.filter(m => {
    const meetingDate = parseISO(m.meeting_date);
    return isBefore(meetingDate, today) && !isToday(meetingDate);
  });

  const todaysMeeting = meetings.find(m => isToday(parseISO(m.meeting_date)));

  // Calculate stats
  const totalMeetings = meetings.length;
  const attendedMeetings = myAttendance.length;
  const attendanceRate = totalMeetings > 0 ? Math.round((attendedMeetings / totalMeetings) * 100) : 0;

  if (authLoading || loading) {
    return (
      <MobileLayout title="Meetings" familySlug={familySlug}>
        <div className="space-y-4 p-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Meetings" familySlug={familySlug}>
      <div {...handlers} className="relative">
        <PullToRefresh 
          pullDistance={pullDistance}
          isRefreshing={isRefreshing}
        />
        
        {!isOnline && <OfflineIndicator />}

        <div className="space-y-4 p-4 pb-24">
          {/* Today's Meeting Highlight */}
          {todaysMeeting && !todaysMeeting.is_completed && (
            <Card className="bg-primary/5 border-primary/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge className="bg-primary">Today's Meeting</Badge>
                  <div className="flex items-center gap-1 text-sm">
                    <Clock className="h-3 w-3" />
                    <span>{todaysMeeting.meeting_time}</span>
                  </div>
                </div>
                
                {todaysMeeting.location && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                    <MapPin className="h-3 w-3" />
                    <span>{todaysMeeting.location}</span>
                  </div>
                )}

                {myAttendance.includes(todaysMeeting.id) ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">You've checked in</span>
                  </div>
                ) : (
                  <Button 
                    className="w-full"
                    onClick={() => handleCheckIn(todaysMeeting.id)}
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    Scan QR to Check In
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <Calendar className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold">{upcomingMeetings.length}</p>
                <p className="text-xs text-muted-foreground">Upcoming</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-500" />
                <p className="text-lg font-bold">{attendedMeetings}</p>
                <p className="text-xs text-muted-foreground">Attended</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <Users className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                <p className="text-lg font-bold">{attendanceRate}%</p>
                <p className="text-xs text-muted-foreground">Rate</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upcoming">
                Upcoming ({upcomingMeetings.length})
              </TabsTrigger>
              <TabsTrigger value="past">
                Past ({pastMeetings.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-4 space-y-3">
              {upcomingMeetings.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No upcoming meetings</p>
                  </CardContent>
                </Card>
              ) : (
                upcomingMeetings.map(meeting => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    onCheckIn={() => handleCheckIn(meeting.id)}
                    onView={() => handleViewMeeting(meeting.id)}
                    userHasCheckedIn={myAttendance.includes(meeting.id)}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="past" className="mt-4 space-y-3">
              {pastMeetings.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No past meetings</p>
                  </CardContent>
                </Card>
              ) : (
                pastMeetings.map(meeting => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    onView={() => handleViewMeeting(meeting.id)}
                    userHasCheckedIn={myAttendance.includes(meeting.id)}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* QR Scanner Sheet */}
      <Sheet open={scannerSheetOpen} onOpenChange={setScannerSheetOpen}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Scan Meeting QR Code</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <MobileQRScanner
              onScan={handleQRScan}
              onClose={() => setScannerSheetOpen(false)}
              expectedMeetingId={selectedMeetingId || undefined}
            />
          </div>
        </SheetContent>
      </Sheet>
    </MobileLayout>
  );
}

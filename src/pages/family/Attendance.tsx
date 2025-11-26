import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";

interface Attendance {
  id: string;
  status: string;
  check_in_time: string | null;
  lateness_minutes: number | null;
  fine_amount: number | null;
  excuse_reason: string | null;
  notes: string | null;
  member_id: string;
  family_members: {
    profiles: {
      full_name: string;
    } | null;
  } | null;
}

interface Member {
  id: string;
  profiles: {
    full_name: string;
  } | null;
}

interface Meeting {
  id: string;
  meeting_date: string;
  meeting_time: string;
  location: string | null;
  meeting_type: string;
}

export default function Attendance() {
  const { familyId } = useParams();
  const [searchParams] = useSearchParams();
  const meetingId = searchParams.get("meeting");
  const navigate = useNavigate();
  const { toast } = useToast();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string>("");

  useEffect(() => {
    if (familyId && meetingId) {
      fetchMeeting();
      fetchAttendance();
      fetchMembers();
    }
  }, [familyId, meetingId]);

  const fetchMeeting = async () => {
    try {
      const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .eq("id", meetingId)
        .single();

      if (error) throw error;
      setMeeting(data);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error fetching meeting",
        description: error.message,
      });
    }
  };

  const fetchAttendance = async () => {
    try {
      const { data, error } = await supabase
        .from("attendance")
        .select(`
          *,
          family_members(
            profiles(full_name)
          )
        `)
        .eq("meeting_id", meetingId);

      if (error) throw error;
      setAttendance(data as any || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error fetching attendance",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("family_members")
        .select("id, profiles(full_name)")
        .eq("family_id", familyId);

      if (error) throw error;
      setMembers(data as any || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error fetching members",
        description: error.message,
      });
    }
  };

  const handleCheckIn = async (memberId: string) => {
    if (!meeting) return;

    const checkInTime = new Date();
    const meetingDateTime = new Date(`${meeting.meeting_date}T${meeting.meeting_time}`);
    const latenessMinutes = Math.max(0, differenceInMinutes(checkInTime, meetingDateTime));
    
    let fineAmount = 0;
    if (latenessMinutes > 60) {
      fineAmount = 1000;
    } else if (latenessMinutes > 30) {
      fineAmount = 500;
    }

    try {
      const existing = attendance.find((a) => a.member_id === memberId);
      
      if (existing) {
        const { error } = await supabase
          .from("attendance")
          .update({
            status: "present",
            check_in_time: checkInTime.toISOString(),
            lateness_minutes: latenessMinutes,
            fine_amount: fineAmount,
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("attendance").insert({
          meeting_id: meetingId,
          member_id: memberId,
          status: "present",
          check_in_time: checkInTime.toISOString(),
          lateness_minutes: latenessMinutes,
          fine_amount: fineAmount,
        });

        if (error) throw error;
      }

      toast({
        title: "Check-in recorded",
        description: fineAmount > 0 ? `Late by ${latenessMinutes} minutes. Fine: ${fineAmount} FCFA` : "On time!",
      });

      fetchAttendance();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error recording check-in",
        description: error.message,
      });
    }
  };

  const handleMarkStatus = async (memberId: string, status: string, excuseReason?: string) => {
    try {
      const existing = attendance.find((a) => a.member_id === memberId);
      
      if (existing) {
        const { error } = await supabase
          .from("attendance")
          .update({
            status,
            excuse_reason: excuseReason || null,
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("attendance").insert({
          meeting_id: meetingId,
          member_id: memberId,
          status,
          excuse_reason: excuseReason || null,
        });

        if (error) throw error;
      }

      toast({
        title: "Attendance updated",
        description: `Marked as ${status}`,
      });

      setIsDialogOpen(false);
      fetchAttendance();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating attendance",
        description: error.message,
      });
    }
  };

  const getAttendanceForMember = (memberId: string) => {
    return attendance.find((a) => a.member_id === memberId);
  };

  const stats = {
    present: attendance.filter((a) => a.status === "present").length,
    absent: attendance.filter((a) => a.status === "absent").length,
    excused: attendance.filter((a) => a.status === "excused").length,
    totalFines: attendance.reduce((sum, a) => sum + (a.fine_amount || 0), 0),
  };

  if (loading || !meeting) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/family/${familyId}/meetings`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Attendance Tracking</h1>
          <p className="text-muted-foreground">
            {format(new Date(meeting.meeting_date), "PPP")} at {meeting.meeting_time}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.present}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.absent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Excused</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.excused}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fines</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFines} FCFA</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Member Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.map((member) => {
              const memberAttendance = getAttendanceForMember(member.id);
              return (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                    <p className="font-medium">{member.profiles?.full_name || "Unknown"}</p>
                    {memberAttendance && memberAttendance.check_in_time && (
                      <p className="text-sm text-muted-foreground">
                        Check-in: {format(new Date(memberAttendance.check_in_time), "p")}
                        {memberAttendance.lateness_minutes && memberAttendance.lateness_minutes > 0 && (
                          <span className="text-orange-600"> • Late by {memberAttendance.lateness_minutes} min</span>
                        )}
                      </p>
                    )}
                    {memberAttendance && memberAttendance.excuse_reason && (
                      <p className="text-sm text-muted-foreground">Excuse: {memberAttendance.excuse_reason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {memberAttendance && memberAttendance.fine_amount && memberAttendance.fine_amount > 0 && (
                      <Badge variant="destructive">{memberAttendance.fine_amount} FCFA fine</Badge>
                    )}
                    {memberAttendance ? (
                      <Badge
                        variant={
                          memberAttendance.status === "present"
                            ? "default"
                            : memberAttendance.status === "excused"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {memberAttendance.status}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Not marked</Badge>
                    )}
                    {!memberAttendance || memberAttendance.status !== "present" ? (
                      <Button size="sm" onClick={() => handleCheckIn(member.id)}>
                        Check In
                      </Button>
                    ) : null}
                    <Dialog open={isDialogOpen && selectedMember === member.id} onOpenChange={(open) => {
                      setIsDialogOpen(open);
                      if (open) setSelectedMember(member.id);
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          Mark
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Update Attendance - {member.profiles?.full_name || "Unknown"}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Button onClick={() => handleMarkStatus(member.id, "absent")} className="w-full" variant="destructive">
                            Mark Absent
                          </Button>
                          <div className="space-y-2">
                            <Label>Mark as Excused</Label>
                            <Textarea
                              id={`excuse-${member.id}`}
                              placeholder="Reason for excuse (sickness, travel, etc.)"
                            />
                            <Button
                              onClick={() => {
                                const reason = (document.getElementById(`excuse-${member.id}`) as HTMLTextAreaElement)?.value;
                                handleMarkStatus(member.id, "excused", reason);
                              }}
                              className="w-full"
                              variant="secondary"
                            >
                              Mark Excused
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

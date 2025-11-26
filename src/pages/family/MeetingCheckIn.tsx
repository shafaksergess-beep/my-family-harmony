import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, QrCode, Camera, CheckCircle } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { QRCodeSVG } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const MeetingCheckIn = () => {
  const { familySlug, meetingId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [meeting, setMeeting] = useState<any>(null);
  const [family, setFamily] = useState<any>(null);
  const [userMember, setUserMember] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);

  useEffect(() => {
    loadData();
    return () => {
      // Cleanup QR scanner on unmount
      const html5QrCode = Html5Qrcode.getCameras();
    };
  }, [familySlug, meetingId]);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Load family
      const { data: familyData } = await supabase
        .from("families")
        .select("*")
        .eq("slug", familySlug)
        .single();

      if (!familyData) {
        navigate("/dashboard");
        return;
      }

      setFamily(familyData);

      // Load meeting
      const { data: meetingData } = await supabase
        .from("meetings")
        .select("*")
        .eq("id", meetingId)
        .eq("family_id", familyData.id)
        .single();

      if (!meetingData) {
        navigate(`/family/${familySlug}/meetings`);
        return;
      }

      setMeeting(meetingData);

      // Load user's member record
      const { data: memberData } = await supabase
        .from("family_members")
        .select("*")
        .eq("family_id", familyData.id)
        .eq("user_id", session.user.id)
        .single();

      setUserMember(memberData);

      // Check if user has already checked in
      const { data: existingAttendance } = await supabase
        .from("attendance")
        .select("*")
        .eq("meeting_id", meetingId)
        .eq("member_id", memberData?.id)
        .maybeSingle();

      if (existingAttendance) {
        setHasCheckedIn(true);
      }

      // Load all attendance records
      await loadAttendance();
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load meeting details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async () => {
    const { data: attendanceData } = await supabase
      .from("attendance")
      .select(`
        *,
        family_members!inner (
          profiles!inner (full_name)
        )
      `)
      .eq("meeting_id", meetingId)
      .order("check_in_time", { ascending: false });

    setAttendance(attendanceData || []);
  };

  const generateQRData = () => {
    return JSON.stringify({
      meetingId,
      familyId: family.id,
      familySlug,
    });
  };

  const handleCheckIn = async () => {
    try {
      if (!userMember) {
        toast({
          title: "Error",
          description: "You are not a member of this family",
          variant: "destructive",
        });
        return;
      }

      const checkInTime = new Date();
      const meetingDateTime = new Date(`${meeting.meeting_date}T${meeting.meeting_time}`);
      const latenessMinutes = Math.max(0, Math.floor((checkInTime.getTime() - meetingDateTime.getTime()) / 60000));
      
      // Get family fine configuration
      const toleranceMinutes = family.lateness_tolerance_minutes || 30;
      const fine30 = family.fine_after_30min || 500;
      const fine60 = family.fine_after_60min || 1000;
      
      // Calculate fine based on lateness and tolerance
      let fineAmount = 0;
      if (latenessMinutes > toleranceMinutes && latenessMinutes <= 60) {
        fineAmount = fine30;
      } else if (latenessMinutes > 60) {
        fineAmount = fine60;
      }

      // Insert attendance record
      const { data: attendanceRecord, error: attendanceError } = await supabase
        .from("attendance")
        .insert({
          meeting_id: meetingId,
          member_id: userMember.id,
          status: latenessMinutes > toleranceMinutes ? 'late' : 'present',
          check_in_time: checkInTime.toISOString(),
          lateness_minutes: latenessMinutes,
          fine_amount: fineAmount,
        })
        .select()
        .single();

      if (attendanceError) throw attendanceError;

      // If there's a fine, record it in the member's wallet
      if (fineAmount > 0) {
        // Get or create wallet
        const { data: wallet, error: walletError } = await supabase
          .from("member_wallets")
          .select("id")
          .eq("member_id", userMember.id)
          .eq("family_id", family.id)
          .maybeSingle();

        if (walletError) throw walletError;

        const walletId = wallet?.id;
        if (walletId) {
          // Record fine as negative transaction
          const { error: transactionError } = await supabase
            .from("wallet_transactions")
            .insert({
              wallet_id: walletId,
              amount: -fineAmount,
              transaction_type: "fine",
              description: `Lateness fine: ${latenessMinutes} minutes late`,
              reference_id: attendanceRecord.id,
              reference_type: "attendance",
            });

          if (transactionError) throw transactionError;
        }
      }

      setHasCheckedIn(true);
      await loadAttendance();

      toast({
        title: "Success",
        description: latenessMinutes > toleranceMinutes
          ? `Checked in (${latenessMinutes} min late). Fine: ${fineAmount} FCFA`
          : "Checked in successfully!",
      });
    } catch (error: any) {
      console.error("Error checking in:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to check in",
        variant: "destructive",
      });
    }
  };

  const startQRScanner = async () => {
    setScanning(true);
    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      
      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        async (decodedText) => {
          // Stop scanning
          await html5QrCode.stop();
          setScanning(false);
          
          // Process QR code
          try {
            const data = JSON.parse(decodedText);
            if (data.meetingId === meetingId) {
              await handleCheckIn();
            } else {
              toast({
                title: "Invalid QR Code",
                description: "This QR code is not for this meeting",
                variant: "destructive",
              });
            }
          } catch (error) {
            toast({
              title: "Error",
              description: "Invalid QR code format",
              variant: "destructive",
            });
          }
        },
        () => {
          // Error callback - ignore
        }
      );
    } catch (error) {
      console.error("Error starting scanner:", error);
      setScanning(false);
      toast({
        title: "Error",
        description: "Failed to start camera",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate(`/family/${familySlug}/meetings`)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("common.back")}
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <QrCode className="w-6 h-6" />
                  Meeting Check-In
                </h1>
                <p className="text-sm text-muted-foreground">
                  {family?.name} • {new Date(meeting?.meeting_date).toLocaleDateString()}
                </p>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Tabs defaultValue="checkin">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="checkin">Check In</TabsTrigger>
            <TabsTrigger value="qr">QR Code</TabsTrigger>
            <TabsTrigger value="attendance">Attendance ({attendance.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="checkin" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quick Check-In</CardTitle>
                <CardDescription>
                  Mark your attendance for this meeting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasCheckedIn ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                    <h3 className="text-xl font-semibold mb-2">Already Checked In</h3>
                    <p className="text-muted-foreground">You have already checked in for this meeting</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-muted p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Meeting Details:</h3>
                      <p className="text-sm">Date: {new Date(meeting.meeting_date).toLocaleDateString()}</p>
                      <p className="text-sm">Time: {meeting.meeting_time}</p>
                      <p className="text-sm">Type: {meeting.meeting_type}</p>
                    </div>

                    <Button onClick={handleCheckIn} className="w-full" size="lg">
                      Check In Now
                    </Button>

                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Or scan the QR code</p>
                      <Button 
                        variant="outline" 
                        onClick={startQRScanner}
                        disabled={scanning}
                        className="mt-2"
                      >
                        {scanning ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Scanning...
                          </>
                        ) : (
                          <>
                            <Camera className="w-4 h-4 mr-2" />
                            Scan QR Code
                          </>
                        )}
                      </Button>
                    </div>

                    {scanning && (
                      <div id="qr-reader" className="rounded-lg overflow-hidden"></div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="qr">
            <Card>
              <CardHeader>
                <CardTitle>Meeting QR Code</CardTitle>
                <CardDescription>
                  Members can scan this code to check in
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center py-8">
                  <div className="bg-white p-4 rounded-lg">
                    <QRCodeSVG 
                      value={generateQRData()}
                      size={256}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    Display this QR code for members to scan and check in
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance" className="space-y-4">
            {attendance.length === 0 ? (
              <Card className="p-12 text-center">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No attendees yet</h3>
                <p className="text-muted-foreground">Be the first to check in!</p>
              </Card>
            ) : (
              attendance.map((record) => (
                <Card key={record.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{record.family_members.profiles.full_name}</p>
                          <Badge 
                            variant="outline" 
                            className={record.status === 'present' 
                              ? 'bg-green-500/10 text-green-500 border-green-500/20'
                              : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}
                          >
                            {record.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(record.check_in_time).toLocaleTimeString()}
                        </p>
                        {record.lateness_minutes > 0 && (
                          <p className="text-sm text-yellow-600">
                            Late by {record.lateness_minutes} minutes • Fine: {record.fine_amount} FCFA
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default MeetingCheckIn;

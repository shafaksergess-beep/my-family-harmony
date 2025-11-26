import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { Loader2, ArrowLeft, Plus, Calendar, MapPin, Clock, QrCode, CalendarRange } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { meetingSchema, type MeetingInput } from "@/lib/validation";
import { MeetingsCalendar } from "@/components/MeetingsCalendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Meeting {
  id: string;
  meeting_date: string;
  meeting_time: string;
  meeting_type: string;
  location: string | null;
  host_house: string | null;
  is_completed: boolean;
}

const FamilyMeetings = () => {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { family, isFamilyHead, isLoading: authLoading } = useFamilyAuth(familySlug);
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    meeting_date: "",
    meeting_time: "13:00",
    meeting_type: "regular",
    location: "",
    host_house: "",
    agenda: "",
  });
  const [bulkFormData, setBulkFormData] = useState({
    start_date: "",
    meeting_time: "13:00",
    meeting_type: "regular",
    location: "",
    months: "12",
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, [familySlug]);

  const loadData = async () => {
    if (!family) return;
    
    try {
      const { data: meetingsData } = await supabase
        .from("meetings")
        .select("*")
        .eq("family_id", family.id)
        .order("meeting_date", { ascending: false });
      
      setMeetings(meetingsData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    
    // Validate input
    const validationResult = meetingSchema.safeParse({
      meetingDate: formData.meeting_date,
      meetingTime: formData.meeting_time,
      location: formData.location || undefined,
      hostHouse: formData.host_house || undefined,
      agenda: formData.agenda || undefined,
      meetingType: formData.meeting_type,
    });

    if (!validationResult.success) {
      const errors: Record<string, string> = {};
      validationResult.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        errors[field] = err.message;
      });
      setValidationErrors(errors);
      toast({
        title: "Validation Error",
        description: "Please check the form for errors",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from("meetings")
        .insert({
          family_id: family.id,
          meeting_date: validationResult.data.meetingDate,
          meeting_time: validationResult.data.meetingTime,
          meeting_type: validationResult.data.meetingType,
          location: validationResult.data.location || null,
          host_house: validationResult.data.hostHouse || null,
          agenda: validationResult.data.agenda || null,
        });

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Meeting created successfully",
      });

      setIsDialogOpen(false);
      setFormData({
        meeting_date: "",
        meeting_time: "13:00",
        meeting_type: "regular",
        location: "",
        host_house: "",
        agenda: "",
      });
      setValidationErrors({});
      loadData();
    } catch (error: any) {
      console.error("Error creating meeting:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create meeting",
        variant: "destructive",
      });
    }
  };

  const handleBulkSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bulkFormData.start_date) {
      toast({
        title: "Validation Error",
        description: "Please select a start date",
        variant: "destructive",
      });
      return;
    }

    const months = parseInt(bulkFormData.months);
    if (months < 1 || months > 12) {
      toast({
        title: "Validation Error",
        description: "Please select between 1 and 12 months",
        variant: "destructive",
      });
      return;
    }

    try {
      const meetingsToCreate = [];
      const startDate = new Date(bulkFormData.start_date);
      
      for (let i = 0; i < months; i++) {
        const meetingDate = new Date(startDate);
        meetingDate.setMonth(startDate.getMonth() + i);
        
        meetingsToCreate.push({
          family_id: family.id,
          meeting_date: meetingDate.toISOString().split('T')[0],
          meeting_time: bulkFormData.meeting_time,
          meeting_type: bulkFormData.meeting_type,
          location: bulkFormData.location || null,
          host_house: null,
          agenda: `${meetingDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Monthly Meeting`,
        });
      }

      const { error } = await supabase
        .from("meetings")
        .insert(meetingsToCreate);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: `${months} meetings scheduled successfully`,
      });

      setIsBulkDialogOpen(false);
      setBulkFormData({
        start_date: "",
        meeting_time: "13:00",
        meeting_type: "regular",
        location: "",
        months: "12",
      });
      loadData();
    } catch (error: any) {
      console.error("Error bulk scheduling meetings:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to schedule meetings",
        variant: "destructive",
      });
    }
  };

  if (authLoading || loading) {
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
              <Button variant="ghost" onClick={() => navigate(`/family/${familySlug}`)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{family?.name} - Meetings</h1>
                <p className="text-sm text-muted-foreground">Schedule and track family meetings</p>
              </div>
            </div>
            
            {isFamilyHead && (
              <div className="flex gap-2">
                <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <CalendarRange className="w-4 h-4 mr-2" />
                      Schedule Year
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Bulk Schedule Meetings</DialogTitle>
                      <DialogDescription>
                        Schedule monthly meetings for the year
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleBulkSchedule} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="bulk-start-date">Start Date</Label>
                        <Input
                          id="bulk-start-date"
                          type="date"
                          value={bulkFormData.start_date}
                          onChange={(e) => setBulkFormData({ ...bulkFormData, start_date: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bulk-time">Meeting Time</Label>
                        <Input
                          id="bulk-time"
                          type="time"
                          value={bulkFormData.meeting_time}
                          onChange={(e) => setBulkFormData({ ...bulkFormData, meeting_time: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bulk-months">Number of Months</Label>
                        <Select 
                          value={bulkFormData.months} 
                          onValueChange={(value) => setBulkFormData({ ...bulkFormData, months: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[...Array(12)].map((_, i) => (
                              <SelectItem key={i + 1} value={String(i + 1)}>
                                {i + 1} {i === 0 ? 'month' : 'months'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bulk-location">Location (optional)</Label>
                        <Input
                          id="bulk-location"
                          value={bulkFormData.location}
                          onChange={(e) => setBulkFormData({ ...bulkFormData, location: e.target.value })}
                          placeholder="Meeting location"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Schedule Meetings</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Meeting
                    </Button>
                  </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Schedule New Meeting</DialogTitle>
                  <DialogDescription>
                    Create a new family meeting
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Meeting Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.meeting_date}
                        onChange={(e) => {
                          setFormData({ ...formData, meeting_date: e.target.value });
                          setValidationErrors({ ...validationErrors, meetingDate: "" });
                        }}
                        className={validationErrors.meetingDate ? "border-red-500" : ""}
                        required
                      />
                      {validationErrors.meetingDate && (
                        <p className="text-sm text-red-500">{validationErrors.meetingDate}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time">Meeting Time</Label>
                      <Input
                        id="time"
                        type="time"
                        value={formData.meeting_time}
                        onChange={(e) => {
                          setFormData({ ...formData, meeting_time: e.target.value });
                          setValidationErrors({ ...validationErrors, meetingTime: "" });
                        }}
                        className={validationErrors.meetingTime ? "border-red-500" : ""}
                        required
                      />
                      {validationErrors.meetingTime && (
                        <p className="text-sm text-red-500">{validationErrors.meetingTime}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Meeting Type</Label>
                    <Select 
                      value={formData.meeting_type} 
                      onValueChange={(value) => {
                        setFormData({ ...formData, meeting_type: value });
                        setValidationErrors({ ...validationErrors, meetingType: "" });
                      }}
                    >
                      <SelectTrigger className={validationErrors.meetingType ? "border-red-500" : ""}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="regular">Regular</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                        <SelectItem value="special">Special</SelectItem>
                      </SelectContent>
                    </Select>
                    {validationErrors.meetingType && (
                      <p className="text-sm text-red-500">{validationErrors.meetingType}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location (optional)</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => {
                        setFormData({ ...formData, location: e.target.value });
                        setValidationErrors({ ...validationErrors, location: "" });
                      }}
                      placeholder="Meeting location"
                      maxLength={200}
                      className={validationErrors.location ? "border-red-500" : ""}
                    />
                    {validationErrors.location && (
                      <p className="text-sm text-red-500">{validationErrors.location}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="host">Host House (optional)</Label>
                    <Input
                      id="host"
                      value={formData.host_house}
                      onChange={(e) => {
                        setFormData({ ...formData, host_house: e.target.value });
                        setValidationErrors({ ...validationErrors, hostHouse: "" });
                      }}
                      placeholder="Host house name"
                      maxLength={100}
                      className={validationErrors.hostHouse ? "border-red-500" : ""}
                    />
                    {validationErrors.hostHouse && (
                      <p className="text-sm text-red-500">{validationErrors.hostHouse}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agenda">Agenda (optional)</Label>
                    <Textarea
                      id="agenda"
                      value={formData.agenda}
                      onChange={(e) => {
                        setFormData({ ...formData, agenda: e.target.value });
                        setValidationErrors({ ...validationErrors, agenda: "" });
                      }}
                      placeholder="Meeting agenda"
                      rows={3}
                      maxLength={1000}
                      className={validationErrors.agenda ? "border-red-500" : ""}
                    />
                    {validationErrors.agenda && (
                      <p className="text-sm text-red-500">{validationErrors.agenda}</p>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create Meeting</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {meetings.length === 0 ? (
          <Card className="p-12 text-center">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2 text-foreground">No meetings scheduled</h3>
            <p className="text-muted-foreground mb-6">Create your first meeting to get started</p>
            {isFamilyHead && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Meeting
              </Button>
            )}
          </Card>
        ) : (
          <Tabs defaultValue="calendar" className="space-y-6">
            <TabsList>
              <TabsTrigger value="calendar">Calendar View</TabsTrigger>
              <TabsTrigger value="list">List View</TabsTrigger>
            </TabsList>

            <TabsContent value="calendar">
              <MeetingsCalendar meetings={meetings} />
            </TabsContent>

            <TabsContent value="list">
              <div className="grid gap-4">
                {meetings.map((meeting) => (
              <Card key={meeting.id} className="hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      {new Date(meeting.meeting_date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </CardTitle>
                    <span className={`px-3 py-1 rounded text-xs font-medium ${meeting.is_completed ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {meeting.is_completed ? 'Completed' : 'Upcoming'}
                    </span>
                  </div>
                  <CardDescription className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {meeting.meeting_time}
                    </span>
                    {meeting.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {meeting.location}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">Type:</span>
                      <span className="capitalize">{meeting.meeting_type}</span>
                    </div>
                    {meeting.host_house && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">Host:</span>
                        <span>{meeting.host_house}</span>
                      </div>
                    )}
                    <div className="flex gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => navigate(`/family/${familySlug}/meetings/${meeting.id}`)}
                      >
                        View Details
                      </Button>
                      {!meeting.is_completed && (
                        <Button 
                          className="flex-1"
                          onClick={() => navigate(`/family/${familySlug}/meetings/${meeting.id}/checkin`)}
                        >
                          <QrCode className="w-4 h-4 mr-2" />
                          Check In
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default FamilyMeetings;

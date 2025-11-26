import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { Loader2, ArrowLeft, Plus, Calendar, MapPin, Clock, QrCode } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [formData, setFormData] = useState({
    meeting_date: "",
    meeting_time: "13:00",
    meeting_type: "regular",
    location: "",
    host_house: "",
    agenda: "",
  });

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
    
    try {
      const { error } = await supabase
        .from("meetings")
        .insert({
          family_id: family.id,
          ...formData,
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
                        onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time">Meeting Time</Label>
                      <Input
                        id="time"
                        type="time"
                        value={formData.meeting_time}
                        onChange={(e) => setFormData({ ...formData, meeting_time: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Meeting Type</Label>
                    <Select value={formData.meeting_type} onValueChange={(value) => setFormData({ ...formData, meeting_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="regular">Regular</SelectItem>
                        <SelectItem value="extraordinary">Extraordinary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Meeting location"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="host">Host House</Label>
                    <Input
                      id="host"
                      value={formData.host_house}
                      onChange={(e) => setFormData({ ...formData, host_house: e.target.value })}
                      placeholder="Host house name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agenda">Agenda</Label>
                    <Textarea
                      id="agenda"
                      value={formData.agenda}
                      onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                      placeholder="Meeting agenda"
                      rows={3}
                    />
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
        )}
      </main>
    </div>
  );
};

export default FamilyMeetings;

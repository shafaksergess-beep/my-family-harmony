import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface AssistanceEvent {
  id: string;
  event_type: string;
  event_date: string;
  amount: number;
  contribution_per_member: number | null;
  is_paid: boolean;
  payment_date: string | null;
  notes: string | null;
  beneficiary_name: string | null;
  hospitalization_days: number | null;
  family_members: {
    id: string;
    profiles: {
      full_name: string;
    };
  };
}

interface FamilyMember {
  id: string;
  profiles: {
    full_name: string;
  };
}

const EVENT_TYPES = {
  birth: { label: "Birth", amount: 5000, description: "5,000 FCFA per member" },
  member_death: { label: "Member Death", amount: 1000000, description: "1,000,000 FCFA total" },
  spouse_death: { label: "Spouse Death", amount: 500000, description: "500,000 FCFA total" },
  child_death: { label: "Child Death", amount: 500000, description: "500,000 FCFA total" },
  external_wonya: { label: "External Wonya Kotto", amount: 150000, description: "Up to 150,000 FCFA" },
  external_other: { label: "External Other", amount: 100000, description: "Up to 100,000 FCFA" },
  sickness: { label: "Sickness (5+ days)", amount: 50000, description: "50,000 FCFA" },
};

export default function FamilyAssistance() {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<AssistanceEvent[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [familyId, setFamilyId] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    member_id: "",
    event_type: "",
    event_date: new Date().toISOString().split('T')[0],
    beneficiary_name: "",
    hospitalization_days: "",
    amount: "",
    contribution_per_member: "",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, [familySlug]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: familyData, error: familyError } = await supabase
        .from("families")
        .select("id")
        .eq("slug", familySlug)
        .single();

      if (familyError || !familyData) {
        toast({ title: "Error", description: "Family not found", variant: "destructive" });
        navigate("/dashboard");
        return;
      }

      setFamilyId(familyData.id);

      const { data: eventsData, error: eventsError } = await supabase
        .from("assistance_events")
        .select(`
          *,
          family_members!inner(
            id,
            profiles!inner(full_name)
          )
        `)
        .eq("family_id", familyData.id)
        .order("event_date", { ascending: false });

      if (eventsError) throw eventsError;
      setEvents(eventsData as any);

      const { data: membersData, error: membersError } = await supabase
        .from("family_members")
        .select(`
          id,
          profiles!inner(full_name)
        `)
        .eq("family_id", familyData.id);

      if (membersError) throw membersError;
      setMembers(membersData as any);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEventTypeChange = (eventType: string) => {
    const eventConfig = EVENT_TYPES[eventType as keyof typeof EVENT_TYPES];
    setFormData({
      ...formData,
      event_type: eventType,
      amount: eventConfig.amount.toString(),
      contribution_per_member: eventType === 'birth' ? eventConfig.amount.toString() : "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("assistance_events").insert({
        family_id: familyId,
        member_id: formData.member_id,
        event_type: formData.event_type,
        event_date: formData.event_date,
        amount: parseFloat(formData.amount),
        contribution_per_member: formData.contribution_per_member ? parseFloat(formData.contribution_per_member) : null,
        beneficiary_name: formData.beneficiary_name || null,
        hospitalization_days: formData.hospitalization_days ? parseInt(formData.hospitalization_days) : null,
        notes: formData.notes || null,
      });

      if (error) throw error;

      toast({ title: "Success", description: "Assistance event recorded" });
      setIsDialogOpen(false);
      setFormData({
        member_id: "",
        event_type: "",
        event_date: new Date().toISOString().split('T')[0],
        beneficiary_name: "",
        hospitalization_days: "",
        amount: "",
        contribution_per_member: "",
        notes: "",
      });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleMarkPaid = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from("assistance_events")
        .update({
          is_paid: true,
          payment_date: new Date().toISOString(),
        })
        .eq("id", eventId);

      if (error) throw error;

      toast({ title: "Success", description: "Event marked as paid" });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const calculateStats = () => {
    const totalAmount = events.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
    const pendingAmount = events.filter(e => !e.is_paid).reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
    const paidAmount = events.filter(e => e.is_paid).reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);

    return { totalAmount, pendingAmount, paidAmount };
  };

  const stats = calculateStats();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/family/${familySlug}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Assistance Events</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="text-sm text-muted-foreground">Total Assistance</div>
            <div className="text-2xl font-bold">{stats.totalAmount.toLocaleString()} FCFA</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-muted-foreground">Pending</div>
            <div className="text-2xl font-bold">{stats.pendingAmount.toLocaleString()} FCFA</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-muted-foreground">Paid</div>
            <div className="text-2xl font-bold">{stats.paidAmount.toLocaleString()} FCFA</div>
          </Card>
        </div>

        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Events History</h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Record Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Record Assistance Event</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="member">Member</Label>
                    <Select
                      value={formData.member_id}
                      onValueChange={(value) => setFormData({ ...formData, member_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select member" />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.profiles.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="event_type">Event Type</Label>
                    <Select
                      value={formData.event_type}
                      onValueChange={handleEventTypeChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select event type" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(EVENT_TYPES).map(([key, value]) => (
                          <SelectItem key={key} value={key}>
                            {value.label} - {value.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="event_date">Event Date</Label>
                    <Input
                      id="event_date"
                      type="date"
                      value={formData.event_date}
                      onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="amount">Total Amount (FCFA)</Label>
                    <Input
                      id="amount"
                      type="number"
                      min="0"
                      step="1000"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                  </div>
                </div>
                {formData.event_type === 'birth' && (
                  <div>
                    <Label htmlFor="contribution">Contribution Per Member (FCFA)</Label>
                    <Input
                      id="contribution"
                      type="number"
                      min="0"
                      step="1000"
                      value={formData.contribution_per_member}
                      onChange={(e) => setFormData({ ...formData, contribution_per_member: e.target.value })}
                    />
                  </div>
                )}
                {(formData.event_type.includes('death') || formData.event_type.includes('external')) && (
                  <div>
                    <Label htmlFor="beneficiary">Beneficiary Name</Label>
                    <Input
                      id="beneficiary"
                      value={formData.beneficiary_name}
                      onChange={(e) => setFormData({ ...formData, beneficiary_name: e.target.value })}
                    />
                  </div>
                )}
                {formData.event_type === 'sickness' && (
                  <div>
                    <Label htmlFor="hospitalization">Hospitalization Days</Label>
                    <Input
                      id="hospitalization"
                      type="number"
                      min="5"
                      value={formData.hospitalization_days}
                      onChange={(e) => setFormData({ ...formData, hospitalization_days: e.target.value })}
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full">Record Event</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">Date</th>
                  <th className="text-left p-4">Member</th>
                  <th className="text-left p-4">Event Type</th>
                  <th className="text-right p-4">Amount</th>
                  <th className="text-center p-4">Status</th>
                  <th className="text-center p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-muted-foreground">
                      No assistance events recorded yet
                    </td>
                  </tr>
                ) : (
                  events.map((event) => (
                    <tr key={event.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">{new Date(event.event_date).toLocaleDateString()}</td>
                      <td className="p-4">{event.family_members.profiles.full_name}</td>
                      <td className="p-4">
                        {EVENT_TYPES[event.event_type as keyof typeof EVENT_TYPES]?.label || event.event_type}
                      </td>
                      <td className="p-4 text-right font-mono">{parseFloat(event.amount.toString()).toLocaleString()} FCFA</td>
                      <td className="p-4 text-center">
                        {event.is_paid ? (
                          <Badge variant="default">Paid</Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {!event.is_paid && (
                          <Button
                            size="sm"
                            onClick={() => handleMarkPaid(event.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Mark Paid
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

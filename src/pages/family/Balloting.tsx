import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { Loader2, ArrowLeft, Shuffle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BallotingScheduleCard } from "@/components/balloting/BallotingScheduleCard";

interface Member {
  id: string;
  profiles: { full_name: string } | null;
}

interface Assignment {
  month: number;
  member_id: string;
  member_name: string;
  house_name?: string | null;
}

interface BallotingRecord {
  id: string;
  year: number;
  assignment_type: string;
  assignments: Assignment[];
  balloted_at: string;
}

const Balloting = () => {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { family, isFamilyHead, isFamilyAdmin, userId, isLoading: authLoading } = useFamilyAuth(familySlug);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [hostingRecord, setHostingRecord] = useState<BallotingRecord | null>(null);
  const [njangiRecord, setNjangiRecord] = useState<BallotingRecord | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [assignmentType, setAssignmentType] = useState<"hosting" | "njangi">("hosting");

  const canManage = isFamilyHead || isFamilyAdmin;

  useEffect(() => {
    if (family) loadData();
  }, [family, selectedYear]);

  const loadData = async () => {
    if (!family) return;
    try {
      const [membersRes, hostingRes, njangiRes] = await Promise.all([
        supabase.from("family_members").select("id, profiles(full_name)").eq("family_id", family.id),
        supabase.from("balloting_assignments").select("*").eq("family_id", family.id).eq("year", selectedYear).eq("assignment_type", "hosting").maybeSingle(),
        supabase.from("balloting_assignments").select("*").eq("family_id", family.id).eq("year", selectedYear).eq("assignment_type", "njangi").maybeSingle(),
      ]);
      setMembers((membersRes.data as any) || []);
      setHostingRecord(hostingRes.data as any);
      setNjangiRecord(njangiRes.data as any);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleBalloting = async () => {
    if (!family || !userId) return;
    try {
      const shuffledMembers = shuffleArray(members);
      const { data: membersWithHouse } = await supabase
        .from("family_members").select("id, house_name, profiles(full_name)").eq("family_id", family.id);

      const assignments: Assignment[] = [];
      for (let month = 1; month <= 12; month++) {
        const member = shuffledMembers[(month - 1) % shuffledMembers.length];
        const withHouse = membersWithHouse?.find((m: any) => m.id === member.id);
        assignments.push({
          month,
          member_id: member.id,
          member_name: member.profiles?.full_name || "Unknown",
          house_name: (withHouse as any)?.house_name || null,
        });
      }

      const existing = assignmentType === "hosting" ? hostingRecord : njangiRecord;
      const assignmentsJson = JSON.parse(JSON.stringify(assignments));
      if (existing) {
        const { error } = await supabase.from("balloting_assignments")
          .update({ assignments: assignmentsJson, balloted_at: new Date().toISOString(), balloted_by: userId })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("balloting_assignments")
          .insert({ family_id: family.id, year: selectedYear, assignment_type: assignmentType, assignments: assignmentsJson, balloted_by: userId });
        if (error) throw error;
      }

      if (assignmentType === "hosting") await syncHostAssignments(assignments);
      if (assignmentType === "njangi") await syncNjangiCycle(assignments);
      toast({ title: "Success", description: `${assignmentType === "hosting" ? "Hosting" : "Njangi"} schedule created` });
      setIsDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create balloting", variant: "destructive" });
    }
  };

  const handleSaveAssignments = async (type: "hosting" | "njangi", assignments: Assignment[]) => {
    const record = type === "hosting" ? hostingRecord : njangiRecord;
    if (!record || !userId) return;
    try {
      const assignmentsJson = JSON.parse(JSON.stringify(assignments));
      const { error } = await supabase.from("balloting_assignments")
        .update({ assignments: assignmentsJson, balloted_at: new Date().toISOString(), balloted_by: userId })
        .eq("id", record.id);
      if (error) throw error;
      if (type === "hosting") await syncHostAssignments(assignments);
      if (type === "njangi") await syncNjangiCycle(assignments);
      toast({ title: "Success", description: "Schedule updated successfully" });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update", variant: "destructive" });
    }
  };

  const handleDeleteSchedule = async (type: "hosting" | "njangi") => {
    const record = type === "hosting" ? hostingRecord : njangiRecord;
    if (!record) return;
    try {
      const { error } = await supabase.from("balloting_assignments").delete().eq("id", record.id);
      if (error) throw error;
      toast({ title: "Success", description: "Schedule deleted" });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete", variant: "destructive" });
    }
  };

  const syncNjangiCycle = async (assignments: Assignment[]) => {
    if (!family) return;
    try {
      const cycleName = `${selectedYear} Njangi`;
      
      // Check if a cycle already exists for this year
      const { data: existingCycle } = await supabase
        .from("njangi_cycles")
        .select("id")
        .eq("family_id", family.id)
        .eq("name", cycleName)
        .maybeSingle();

      let cycleId: string;

      if (existingCycle) {
        cycleId = existingCycle.id;
        // Delete existing participants to replace
        await supabase.from("njangi_participants").delete().eq("cycle_id", cycleId);
      } else {
        const { data: newCycle, error: cycleError } = await supabase
          .from("njangi_cycles")
          .insert({
            family_id: family.id,
            name: cycleName,
            start_date: `${selectedYear}-01-01`,
            amount_per_person: family.njangi_amount || 25000,
            status: "active",
          })
          .select("id")
          .single();
        if (cycleError) throw cycleError;
        cycleId = newCycle.id;
      }

      // Deduplicate members - each member appears once, with their first assignment's order
      const seen = new Set<string>();
      const participantInserts: { cycle_id: string; member_id: string; payout_order: number }[] = [];
      for (const a of assignments) {
        if (!seen.has(a.member_id)) {
          seen.add(a.member_id);
          participantInserts.push({
            cycle_id: cycleId,
            member_id: a.member_id,
            payout_order: participantInserts.length + 1,
          });
        }
      }

      const { error: participantsError } = await supabase
        .from("njangi_participants")
        .insert(participantInserts);
      if (participantsError) throw participantsError;
    } catch (error) {
      console.error("Error syncing njangi cycle:", error);
    }
  };

  const syncHostAssignments = async (assignments: Assignment[]) => {
    if (!family) return;
    try {
      const { data: meetings } = await supabase.from("meetings").select("id, meeting_date")
        .eq("family_id", family.id).gte("meeting_date", `${selectedYear}-01-01`).lte("meeting_date", `${selectedYear}-12-31`);
      for (const meeting of meetings || []) {
        const meetingMonth = new Date(meeting.meeting_date).getMonth() + 1;
        const assignment = assignments.find((a) => a.month === meetingMonth);
        if (assignment) {
          await supabase.from("meetings").update({ host_house: assignment.house_name || assignment.member_name }).eq("id", meeting.id);
        }
      }
    } catch (error) {
      console.error("Error syncing host assignments:", error);
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
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate(`/family/${familySlug}`)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{family?.name} - Balloting</h1>
                <p className="text-sm text-muted-foreground">
                  {canManage ? "Drag to reorder, edit members, or reshuffle" : "Hosting and Njangi schedule assignments"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[...Array(5)].map((_, i) => {
                    const year = new Date().getFullYear() + i;
                    return <SelectItem key={year} value={String(year)}>{year}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
              {canManage && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button><Shuffle className="w-4 h-4 mr-2" /> Run Balloting</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Run Balloting for {selectedYear}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Assignment Type</Label>
                        <Select value={assignmentType} onValueChange={(v: any) => setAssignmentType(v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hosting">Hosting Schedule</SelectItem>
                            <SelectItem value="njangi">Njangi Schedule</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Randomly assigns members to months. Members can appear more than once if there are fewer members than months.
                      </p>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleBalloting}><Shuffle className="w-4 h-4 mr-2" /> Run Balloting</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-6">
          <BallotingScheduleCard
            title="Hosting Schedule"
            year={selectedYear}
            assignments={hostingRecord?.assignments || null}
            ballotedAt={hostingRecord?.balloted_at || null}
            canManage={canManage}
            members={members}
            onSave={(a) => handleSaveAssignments("hosting", a)}
            onDelete={() => handleDeleteSchedule("hosting")}
            onRunBalloting={() => { setAssignmentType("hosting"); setIsDialogOpen(true); }}
          />
          <BallotingScheduleCard
            title="Njangi Schedule"
            year={selectedYear}
            assignments={njangiRecord?.assignments || null}
            ballotedAt={njangiRecord?.balloted_at || null}
            canManage={canManage}
            members={members}
            onSave={(a) => handleSaveAssignments("njangi", a)}
            onDelete={() => handleDeleteSchedule("njangi")}
            onRunBalloting={() => { setAssignmentType("njangi"); setIsDialogOpen(true); }}
          />
        </div>
      </main>
    </div>
  );
};

export default Balloting;

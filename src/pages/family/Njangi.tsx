import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { ArrowLeft, Plus, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LoanDeductionDialog } from "@/components/LoanDeductionDialog";

interface NjangiCycle {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  amount_per_person: number;
  status: string;
  notes: string | null;
}

interface NjangiParticipant {
  id: string;
  payout_order: number;
  payout_date: string | null;
  amount_received: number | null;
  is_paid: boolean;
  notes: string | null;
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

export default function FamilyNjangi() {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { family, canManageFinances, isLoading: authLoading } = useFamilyAuth(familySlug);
  const [loading, setLoading] = useState(true);
  const [cycles, setCycles] = useState<NjangiCycle[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<NjangiCycle | null>(null);
  const [participants, setParticipants] = useState<NjangiParticipant[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [isCycleDialogOpen, setIsCycleDialogOpen] = useState(false);
  const [isParticipantDialogOpen, setIsParticipantDialogOpen] = useState(false);
  const [cycleFormData, setCycleFormData] = useState({
    name: "",
    start_date: new Date().toISOString().split('T')[0],
    amount_per_person: "25000",
    notes: "",
  });
  const [selectedParticipantForPayout, setSelectedParticipantForPayout] = useState<string | null>(null);
  const [isLoanDeductionDialogOpen, setIsLoanDeductionDialogOpen] = useState(false);

  useEffect(() => {
    if (family?.id) {
      loadData();
    }
  }, [family?.id]);

  useEffect(() => {
    if (selectedCycle) {
      loadParticipants(selectedCycle.id);
    }
  }, [selectedCycle]);

  const loadData = async () => {
    if (!family) return;
    
    try {
      setLoading(true);

      const { data: cyclesData, error: cyclesError } = await supabase
        .from("njangi_cycles")
        .select("*")
        .eq("family_id", family.id)
        .order("start_date", { ascending: false });

      if (cyclesError) throw cyclesError;
      setCycles(cyclesData);
      if (cyclesData.length > 0 && !selectedCycle) {
        setSelectedCycle(cyclesData[0]);
      }

      // Fetch family members
      const { data: membersData, error: membersError } = await supabase
        .from("family_members")
        .select("id, user_id")
        .eq("family_id", family.id);

      if (membersError) throw membersError;

      // Fetch profiles
      const userIds = membersData?.map(m => m.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Merge data
      const userIdToProfile = new Map(profilesData?.map(p => [p.id, p]) || []);
      const enrichedMembers = membersData?.map(member => ({
        id: member.id,
        profiles: userIdToProfile.get(member.user_id) || { full_name: "Unknown" }
      })) || [];

      setMembers(enrichedMembers as any);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadParticipants = async (cycleId: string) => {
    try {
      // Fetch participants
      const { data: participantsData, error: participantsError } = await supabase
        .from("njangi_participants")
        .select("*")
        .eq("cycle_id", cycleId)
        .order("payout_order", { ascending: true });

      if (participantsError) throw participantsError;

      // Fetch family members
      const memberIds = participantsData?.map(p => p.member_id) || [];
      const { data: membersData, error: membersError } = await supabase
        .from("family_members")
        .select("id, user_id")
        .in("id", memberIds);

      if (membersError) throw membersError;

      // Fetch profiles
      const userIds = membersData?.map(m => m.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Merge data
      const memberIdToUserId = new Map(membersData?.map(m => [m.id, m.user_id]) || []);
      const userIdToProfile = new Map(profilesData?.map(p => [p.id, p]) || []);

      const enrichedParticipants = participantsData?.map(participant => ({
        ...participant,
        family_members: {
          id: participant.member_id,
          profiles: userIdToProfile.get(memberIdToUserId.get(participant.member_id)!) || { full_name: "Unknown" }
        }
      })) || [];

      setParticipants(enrichedParticipants as any);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!family) return;
    
    try {
      const { error } = await supabase.from("njangi_cycles").insert({
        family_id: family.id,
        name: cycleFormData.name,
        start_date: cycleFormData.start_date,
        amount_per_person: parseFloat(cycleFormData.amount_per_person),
        notes: cycleFormData.notes || null,
      });

      if (error) throw error;

      toast({ title: "Success", description: "Njangi cycle created" });
      setIsCycleDialogOpen(false);
      setCycleFormData({
        name: "",
        start_date: new Date().toISOString().split('T')[0],
        amount_per_person: "25000",
        notes: "",
      });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleMarkPaid = (participantId: string, memberId: string) => {
    setSelectedParticipantForPayout(participantId);
    setIsLoanDeductionDialogOpen(true);
  };

  const confirmPayout = async (deductionAmount: number, remainingPayout: number) => {
    if (!selectedParticipantForPayout || !selectedCycle) return;

    try {
      const participant = participants.find(p => p.id === selectedParticipantForPayout);
      if (!participant) return;

      // Mark payout as paid with actual amount after deduction
      const { error: payoutError } = await supabase
        .from("njangi_participants")
        .update({
          is_paid: true,
          payout_date: new Date().toISOString().split('T')[0],
          amount_received: Math.max(0, remainingPayout),
          notes: deductionAmount > 0 
            ? `${deductionAmount.toLocaleString()} FCFA deducted for loan repayment. Original amount: ${selectedCycle.amount_per_person.toLocaleString()} FCFA`
            : null,
        })
        .eq("id", selectedParticipantForPayout);

      if (payoutError) throw payoutError;

      // If there was a deduction, apply it to the member's loans
      if (deductionAmount > 0) {
        const { data: loans, error: loansError } = await supabase
          .from("loans")
          .select("*")
          .eq("member_id", participant.family_members.id)
          .in("status", ["approved", "disbursed"])
          .order("created_at", { ascending: true });

        if (loansError) throw loansError;

        let remainingDeduction = deductionAmount;
        for (const loan of loans || []) {
          if (remainingDeduction <= 0) break;

          const totalInterest = (loan.amount * loan.interest_rate * loan.term_months) / 100;
          const totalOwed = loan.amount + totalInterest;
          const totalPaid = (loan.amount_paid || 0) + (loan.interest_paid || 0);
          const outstanding = totalOwed - totalPaid;

          const paymentAmount = Math.min(remainingDeduction, outstanding);
          
          // Apply payment (prioritize interest first, then principal)
          const interestRemaining = totalInterest - (loan.interest_paid || 0);
          const interestPayment = Math.min(paymentAmount, interestRemaining);
          const principalPayment = paymentAmount - interestPayment;

          const newInterestPaid = (loan.interest_paid || 0) + interestPayment;
          const newPrincipalPaid = (loan.amount_paid || 0) + principalPayment;
          const newTotalPaid = newPrincipalPaid + newInterestPaid;
          const isFullyPaid = newTotalPaid >= totalOwed;

          const { error: loanUpdateError } = await supabase
            .from("loans")
            .update({
              amount_paid: newPrincipalPaid,
              interest_paid: newInterestPaid,
              status: isFullyPaid ? "repaid" : loan.status,
              notes: `${loan.notes || ""}\n\nAuto-deduction from Njangi payout: ${paymentAmount.toLocaleString()} FCFA (${interestPayment.toLocaleString()} interest + ${principalPayment.toLocaleString()} principal)`,
            })
            .eq("id", loan.id);

          if (loanUpdateError) throw loanUpdateError;

          remainingDeduction -= paymentAmount;
        }
      }

      toast({ 
        title: "Success", 
        description: deductionAmount > 0 
          ? `Payout processed: ${remainingPayout.toLocaleString()} FCFA paid, ${deductionAmount.toLocaleString()} FCFA applied to loans`
          : "Payout marked as paid"
      });
      
      if (selectedCycle) loadParticipants(selectedCycle.id);
      setSelectedParticipantForPayout(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/family/${familySlug}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold">Njangi (Rotating Savings)</h1>
          </div>
          <LanguageSwitcher />
        </div>

        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            {cycles.map((cycle) => (
              <Button
                key={cycle.id}
                variant={selectedCycle?.id === cycle.id ? "default" : "outline"}
                onClick={() => setSelectedCycle(cycle)}
              >
                {cycle.name}
                <Badge variant="secondary" className="ml-2">{cycle.status}</Badge>
              </Button>
            ))}
          </div>
          {canManageFinances && (
            <Dialog open={isCycleDialogOpen} onOpenChange={setIsCycleDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Cycle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Njangi Cycle</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateCycle} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Cycle Name</Label>
                    <Input
                      id="name"
                      value={cycleFormData.name}
                      onChange={(e) => setCycleFormData({ ...cycleFormData, name: e.target.value })}
                      placeholder="e.g., 2025 Njangi"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={cycleFormData.start_date}
                      onChange={(e) => setCycleFormData({ ...cycleFormData, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="amount">Amount Per Person (FCFA)</Label>
                    <Input
                      id="amount"
                      type="number"
                      min="0"
                      step="1000"
                      value={cycleFormData.amount_per_person}
                      onChange={(e) => setCycleFormData({ ...cycleFormData, amount_per_person: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      value={cycleFormData.notes}
                      onChange={(e) => setCycleFormData({ ...cycleFormData, notes: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full">Create Cycle</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {selectedCycle && (
          <>
            <Card className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Cycle Name</div>
                  <div className="text-xl font-bold">{selectedCycle.name}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Amount Per Person</div>
                  <div className="text-xl font-bold">{parseFloat(selectedCycle.amount_per_person.toString()).toLocaleString()} FCFA</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Participants</div>
                  <div className="text-xl font-bold">{participants.length}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <Badge className="text-base">{selectedCycle.status}</Badge>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-semibold">Payout Order</h2>
                {canManageFinances && (
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Participant
                  </Button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4">Order</th>
                      <th className="text-left p-4">Member</th>
                      <th className="text-right p-4">Amount</th>
                      <th className="text-left p-4">Payout Date</th>
                      <th className="text-center p-4">Status</th>
                      <th className="text-center p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center p-8 text-muted-foreground">
                          No participants added yet
                        </td>
                      </tr>
                    ) : (
                      participants.map((participant) => (
                        <tr key={participant.id} className="border-b hover:bg-muted/50">
                          <td className="p-4 font-mono">#{participant.payout_order}</td>
                          <td className="p-4">{participant.family_members.profiles.full_name}</td>
                          <td className="p-4 text-right font-mono">
                            {participant.amount_received 
                              ? parseFloat(participant.amount_received.toString()).toLocaleString() 
                              : parseFloat(selectedCycle.amount_per_person.toString()).toLocaleString()
                            } FCFA
                          </td>
                          <td className="p-4">
                            {participant.payout_date 
                              ? new Date(participant.payout_date).toLocaleDateString() 
                              : '-'
                            }
                          </td>
                          <td className="p-4 text-center">
                            {participant.is_paid ? (
                              <Badge variant="default">Paid</Badge>
                            ) : (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {!participant.is_paid && canManageFinances && (
                              <Button
                                size="sm"
                                onClick={() => handleMarkPaid(participant.id, participant.family_members.id)}
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
          </>
        )}

        {selectedParticipantForPayout && (
          <LoanDeductionDialog
            open={isLoanDeductionDialogOpen}
            onOpenChange={setIsLoanDeductionDialogOpen}
            memberId={participants.find(p => p.id === selectedParticipantForPayout)?.family_members.id || ""}
            payoutAmount={selectedCycle?.amount_per_person || 0}
            payoutType="njangi"
            onConfirm={confirmPayout}
          />
        )}
      </div>
    </div>
  );
}

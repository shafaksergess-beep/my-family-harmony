import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { ArrowLeft, Plus, Download, DollarSign, Check, X, Pencil, Trash2 } from "lucide-react";
import { exportToCSV, formatSavingsForExport } from "@/lib/export";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useCurrency } from "@/context/CurrencyContext";
import { CurrencySelector } from "@/components/CurrencySelector";
import { Badge } from "@/components/ui/badge";
import SEO from "@/components/SEO";
import { EmptyState } from "@/components/EmptyState";

interface Saving {
  id: string;
  member_id: string;
  month: string;
  amount: number;
  notes: string | null;
  status: string;
  rejection_reason: string | null;
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

export default function FamilySavings() {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { family, canManageFinances, memberId, isLoading: authLoading } = useFamilyAuth(familySlug);
  const { formatAmount } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [savings, setSavings] = useState<Saving[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSaving, setEditingSaving] = useState<Saving | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingSavingId, setRejectingSavingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [formData, setFormData] = useState({
    member_id: "",
    month: new Date().toISOString().slice(0, 7),
    amount: "",
    notes: "",
  });

  const loadData = useCallback(async () => {
    if (!family) return;
    
    try {
      setLoading(true);

      const { data: savingsData, error: savingsError } = await supabase
        .from("savings")
        .select("*")
        .eq("family_id", family.id)
        .order("month", { ascending: false });

      if (savingsError) throw savingsError;

      // Fetch family members for enrichment
      const memberIds = [...new Set(savingsData?.map(s => s.member_id) || [])];
      let enrichedSavings: Saving[] = [];

      if (memberIds.length > 0) {
        const { data: membersData } = await supabase
          .from("family_members")
          .select("id, user_id")
          .in("id", memberIds);

        const userIds = membersData?.map(m => m.user_id) || [];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        const memberIdToUserId = new Map(membersData?.map(m => [m.id, m.user_id]) || []);
        const userIdToProfile = new Map(profilesData?.map(p => [p.id, p]) || []);

        enrichedSavings = (savingsData || []).map(saving => ({
          ...saving,
          family_members: {
            id: saving.member_id,
            profiles: userIdToProfile.get(memberIdToUserId.get(saving.member_id)!) || { full_name: "Unknown" }
          }
        })) as unknown as Saving[];
      }

      setSavings(enrichedSavings);

      // Fetch all members for dropdown
      const { data: allMembersData } = await supabase
        .from("family_members")
        .select("id, user_id")
        .eq("family_id", family.id);

      const allUserIds = allMembersData?.map(m => m.user_id) || [];
      const { data: allProfilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", allUserIds);

      const allUserIdToProfile = new Map(allProfilesData?.map(p => [p.id, p]) || []);
      const allEnrichedMembers = (allMembersData || []).map(member => ({
        id: member.id,
        profiles: allUserIdToProfile.get(member.user_id) || { full_name: "Unknown" }
      }));

      setMembers(allEnrichedMembers as FamilyMember[]);
    } catch (error) {
      const err = error as Error;
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [family, toast]);

  useEffect(() => {
    if (family?.id) loadData();
  }, [family?.id, loadData]);

  const notifyLeadership = async (savingsId: string, memberName: string, amount: number, month: string) => {
    if (!family) return;
    const { data: leaders } = await supabase
      .from("family_members")
      .select("id")
      .eq("family_id", family.id)
      .in("role", ["family_head", "family_admin", "treasurer"]);

    if (leaders && leaders.length > 0) {
      const notifications = leaders.map(leader => ({
        savings_id: savingsId,
        family_id: family.id,
        recipient_member_id: leader.id,
        action_type: "new_submission",
        message: `${memberName} submitted a savings of ${formatAmount(amount)} for ${month}. Please review.`,
        created_by: null as string | null,
      }));
      await supabase.from("savings_notifications").insert(notifications);
    }
  };

  const notifyMember = async (savingsId: string, recipientMemberId: string, actionType: string, message: string) => {
    if (!family) return;
    await supabase.from("savings_notifications").insert({
      savings_id: savingsId,
      family_id: family.id,
      recipient_member_id: recipientMemberId,
      action_type: actionType,
      message,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!family) return;
      const monthDate = `${formData.month}-01`;
      const selectedMemberId = canManageFinances ? formData.member_id : memberId;
      
      if (!selectedMemberId) {
        toast({ title: "Error", description: "Member not found", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase.from("savings").insert({
        family_id: family.id,
        member_id: selectedMemberId,
        month: monthDate,
        amount: parseFloat(formData.amount),
        notes: formData.notes || null,
        status: canManageFinances ? "approved" : "pending",
      }).select().single();

      if (error) throw error;

      if (!canManageFinances && data) {
        const memberProfile = members.find(m => m.id === selectedMemberId);
        await notifyLeadership(data.id, memberProfile?.profiles.full_name || "A member", parseFloat(formData.amount), formData.month);
      }

      toast({ title: "Success", description: canManageFinances ? "Savings record added" : "Savings submitted for approval" });
      setIsDialogOpen(false);
      setFormData({ member_id: "", month: new Date().toISOString().slice(0, 7), amount: family?.min_savings_amount?.toString() || "5000", notes: "" });
      loadData();
    } catch (error) {
      const err = error as Error;
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleApprove = async (saving: Saving) => {
    try {
      const { error } = await supabase.from("savings").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", saving.id);
      if (error) throw error;
      await notifyMember(saving.id, saving.member_id, "approved", `Your savings of ${formatAmount(saving.amount)} has been approved.`);
      toast({ title: "Approved", description: "Savings record approved" });
      loadData();
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    }
  };

  const handleReject = async () => {
    if (!rejectingSavingId) return;
    try {
      const saving = savings.find(s => s.id === rejectingSavingId);
      const { error } = await supabase.from("savings").update({ status: "rejected", rejection_reason: rejectionReason }).eq("id", rejectingSavingId);
      if (error) throw error;
      if (saving) {
        await notifyMember(saving.id, saving.member_id, "rejected", `Your savings of ${formatAmount(saving.amount)} was rejected. Reason: ${rejectionReason}`);
      }
      toast({ title: "Rejected", description: "Savings record rejected" });
      setRejectDialogOpen(false);
      setRejectingSavingId(null);
      setRejectionReason("");
      loadData();
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSaving || !family) return;
    try {
      const monthDate = `${formData.month}-01`;
      const { error } = await supabase.from("savings").update({
        member_id: formData.member_id,
        month: monthDate,
        amount: parseFloat(formData.amount),
        notes: formData.notes || null,
      }).eq("id", editingSaving.id);
      if (error) throw error;
      await notifyMember(editingSaving.id, editingSaving.member_id, "modified", `Your savings record has been modified to ${formatAmount(parseFloat(formData.amount))}.`);
      toast({ title: "Updated", description: "Savings record updated" });
      setEditingSaving(null);
      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    }
  };

  const handleDelete = async (saving: Saving) => {
    if (!confirm("Are you sure you want to delete this savings record?")) return;
    try {
      await notifyMember(saving.id, saving.member_id, "deleted", `Your savings record of ${formatAmount(saving.amount)} has been deleted.`);
      const { error } = await supabase.from("savings").delete().eq("id", saving.id);
      if (error) throw error;
      toast({ title: "Deleted", description: "Savings record deleted" });
      loadData();
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    }
  };

  const openEditDialog = (saving: Saving) => {
    setEditingSaving(saving);
    setFormData({
      member_id: saving.member_id,
      month: saving.month.slice(0, 7),
      amount: saving.amount.toString(),
      notes: saving.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleExport = () => {
    const exportData = formatSavingsForExport(savings);
    exportToCSV(exportData, `savings_${new Date().toISOString().split('T')[0]}`);
    toast({ title: "Success", description: "Savings exported to CSV" });
  };

  const stats = (() => {
    const approvedSavings = savings.filter(s => s.status === "approved");
    const totalSavings = approvedSavings.reduce((sum, s) => sum + parseFloat(s.amount.toString()), 0);
    const uniqueMembers = new Set(approvedSavings.map(s => s.member_id)).size;
    const currentMonth = new Date().toISOString().slice(0, 7);
    const thisMonthTotal = approvedSavings.filter(s => s.month.startsWith(currentMonth)).reduce((sum, s) => sum + parseFloat(s.amount.toString()), 0);
    const pendingCount = savings.filter(s => s.status === "pending").length;
    return { totalSavings, uniqueMembers, thisMonthTotal, pendingCount };
  })();

  const statusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      approved: "default",
      pending: "secondary",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <>
      <SEO title="Family Savings" description="Record and review monthly savings with the family approval workflow." />
      <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/family/${familySlug}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold">Individual Savings</h1>
          </div>
          <LanguageSwitcher />
        </div>

        <Card className="p-6 bg-primary/5 border-primary/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Recommended Monthly Savings (Optional)</p>
              <p className="text-2xl font-bold text-primary">{formatAmount(family?.min_savings_amount || 5000)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-primary opacity-50" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">Savings are encouraged but not mandatory</p>
        </Card>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <CurrencySelector />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
            <Card className="p-6">
              <div className="text-sm text-muted-foreground">Total Savings</div>
              <div className="text-2xl font-bold">{formatAmount(stats.totalSavings)}</div>
            </Card>
            <Card className="p-6">
              <div className="text-sm text-muted-foreground">Active Savers</div>
              <div className="text-2xl font-bold">{stats.uniqueMembers}</div>
            </Card>
            <Card className="p-6">
              <div className="text-sm text-muted-foreground">This Month</div>
              <div className="text-2xl font-bold">{formatAmount(stats.thisMonthTotal)}</div>
            </Card>
            {canManageFinances && stats.pendingCount > 0 && (
              <Card className="p-6 border-yellow-500/50 bg-yellow-500/5">
                <div className="text-sm text-muted-foreground">Pending Approval</div>
                <div className="text-2xl font-bold text-yellow-600">{stats.pendingCount}</div>
              </Card>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Savings History</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingSaving(null); }}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingSaving(null);
                  setFormData({ member_id: canManageFinances ? "" : memberId, month: new Date().toISOString().slice(0, 7), amount: family?.min_savings_amount?.toString() || "5000", notes: "" });
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  {canManageFinances ? "Add Savings" : "Record My Savings"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingSaving ? "Edit Savings Record" : (canManageFinances ? "Add Savings Record" : "Record My Savings")}</DialogTitle>
                </DialogHeader>
                <form onSubmit={editingSaving ? handleEditSave : handleSubmit} className="space-y-4">
                  {canManageFinances && (
                    <div>
                      <Label htmlFor="member">Member</Label>
                      <Select value={formData.member_id} onValueChange={(value) => setFormData({ ...formData, member_id: value })}>
                        <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                        <SelectContent>
                          {members.map((member) => (
                            <SelectItem key={member.id} value={member.id}>{member.profiles.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {!canManageFinances && (
                    <p className="text-sm text-muted-foreground">Your savings will be submitted for approval by leadership.</p>
                  )}
                  <div>
                    <Label htmlFor="month">Month</Label>
                    <Input id="month" type="month" value={formData.month} onChange={(e) => setFormData({ ...formData, month: e.target.value })} required />
                  </div>
                  <div>
                    <Label htmlFor="amount">Amount (recommended: {(family?.min_savings_amount || 5000).toLocaleString()})</Label>
                    <Input id="amount" type="number" min="0" step="1000" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
                    <p className="text-xs text-muted-foreground mt-1">Any amount is acceptable; this is optional</p>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                  </div>
                  <Button type="submit" className="w-full">{editingSaving ? "Save Changes" : (canManageFinances ? "Add Savings" : "Submit for Approval")}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Reject Savings</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Reason for rejection</Label>
                <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Provide a reason..." required />
              </div>
              <Button variant="destructive" onClick={handleReject} className="w-full" disabled={!rejectionReason.trim()}>Reject</Button>
            </div>
          </DialogContent>
        </Dialog>

        {savings.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title="No savings recorded yet"
            description="Members can record monthly savings — leadership reviews and approves each entry. Encourage your first deposit today."
            primary={{
              label: canManageFinances ? "Add first savings entry" : "Record my savings",
              onClick: () => {
                setEditingSaving(null);
                setFormData({ member_id: canManageFinances ? "" : memberId, month: new Date().toISOString().slice(0, 7), amount: family?.min_savings_amount?.toString() || "5000", notes: "" });
                setIsDialogOpen(true);
              },
              icon: <Plus className="w-4 h-4 mr-2" />,
            }}
          />
        ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">Member</th>
                  <th className="text-left p-4">Month</th>
                  <th className="text-right p-4">Amount</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Notes</th>
                  {canManageFinances && <th className="text-right p-4">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {savings.length === 0 ? (
                  <tr>
                    <td colSpan={canManageFinances ? 6 : 5} className="text-center p-8 text-muted-foreground">No savings records yet</td>
                  </tr>
                ) : (
                  savings.map((saving) => (
                    <tr key={saving.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">{saving.family_members.profiles.full_name}</td>
                      <td className="p-4">{new Date(saving.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</td>
                      <td className="p-4 text-right font-mono">{formatAmount(parseFloat(saving.amount.toString()))}</td>
                      <td className="p-4">
                        {statusBadge(saving.status)}
                        {saving.status === "rejected" && saving.rejection_reason && (
                          <p className="text-xs text-destructive mt-1">{saving.rejection_reason}</p>
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground">{saving.notes || '-'}</td>
                      {canManageFinances && (
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1">
                            {saving.status === "pending" && (
                              <>
                                <Button size="icon" variant="ghost" className="text-green-600 h-8 w-8" onClick={() => handleApprove(saving)} title="Approve">
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="text-red-600 h-8 w-8" onClick={() => { setRejectingSavingId(saving.id); setRejectDialogOpen(true); }} title="Reject">
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditDialog(saving)} title="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => handleDelete(saving)} title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
        )}
      </div>
    </div>
    </>
  );
}

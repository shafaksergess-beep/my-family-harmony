import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { ArrowLeft, Plus, TrendingUp, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { CurrencySelector } from "@/components/CurrencySelector";
import { useCurrency } from "@/context/CurrencyContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Share {
  id: string;
  share_number: string;
  purchase_date: string;
  share_value: number;
  share_count: number;
  is_active: boolean;
  notes: string | null;
  member_id: string;
  family_members: {
    profiles: { full_name: string };
  };
}

interface Dividend {
  id: string;
  period_year: number;
  period_quarter: number | null;
  amount_per_share: number;
  total_shares: number;
  total_amount: number;
  payment_date: string | null;
  is_paid: boolean;
  source_description: string | null;
}

interface FamilyMember {
  id: string;
  profiles: { full_name: string };
}

export default function FamilyShares() {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { family, canManageFinances, isLoading: authLoading } = useFamilyAuth(familySlug);
  const { formatAmount } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [shares, setShares] = useState<Share[]>([]);
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isDividendDialogOpen, setIsDividendDialogOpen] = useState(false);
  const [editingShare, setEditingShare] = useState<Share | null>(null);
  const [deletingShareId, setDeletingShareId] = useState<string | null>(null);
  const [shareFormData, setShareFormData] = useState({
    member_id: "",
    share_count: "1",
    purchase_date: new Date().toISOString().split('T')[0],
    share_value: "50000",
    notes: "",
  });
  const [dividendFormData, setDividendFormData] = useState({
    period_year: new Date().getFullYear().toString(),
    period_quarter: "",
    amount_per_share: "",
    source_description: "",
    notes: "",
  });

  useEffect(() => {
    if (family?.id) {
      loadData();
    }
  }, [family?.id]);

  const loadData = async () => {
    if (!family) return;
    
    try {
      setLoading(true);

      const { data: sharesData, error: sharesError } = await supabase
        .from("shares")
        .select("*")
        .eq("family_id", family.id)
        .order("purchase_date", { ascending: false });

      if (sharesError) throw sharesError;

      const memberIds = [...new Set(sharesData?.map(s => s.member_id) || [])];
      
      let enrichedShares: Share[] = [];
      
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

        enrichedShares = sharesData?.map(share => ({
          ...share,
          share_count: share.share_count || 1,
          family_members: {
            profiles: userIdToProfile.get(memberIdToUserId.get(share.member_id)!) || { full_name: "Unknown" }
          }
        })) as Share[] || [];
      }

      setShares(enrichedShares);

      const { data: dividendsData, error: dividendsError } = await supabase
        .from("dividends")
        .select("*")
        .eq("family_id", family.id)
        .order("period_year", { ascending: false });

      if (dividendsError) throw dividendsError;
      setDividends(dividendsData);

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
      const allEnrichedMembers = allMembersData?.map(member => ({
        id: member.id,
        profiles: allUserIdToProfile.get(member.user_id) || { full_name: "Unknown" }
      })) || [];

      setMembers(allEnrichedMembers as FamilyMember[]);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (share: Share) => {
    setEditingShare(share);
    setShareFormData({
      member_id: share.member_id,
      share_count: (share.share_count || 1).toString(),
      purchase_date: share.purchase_date,
      share_value: share.share_value.toString(),
      notes: share.notes || "",
    });
    setIsShareDialogOpen(true);
  };

  const resetShareForm = () => {
    setEditingShare(null);
    setShareFormData({
      member_id: "",
      share_count: "1",
      purchase_date: new Date().toISOString().split('T')[0],
      share_value: "50000",
      notes: "",
    });
  };

  const handleCreateOrUpdateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!family) return;
    
    try {
      const payload: any = {
        family_id: family.id,
        member_id: shareFormData.member_id,
        share_count: parseInt(shareFormData.share_count) || 1,
        purchase_date: shareFormData.purchase_date,
        share_value: parseFloat(shareFormData.share_value),
        notes: shareFormData.notes || null,
      };
      // Only include share_number for updates (auto-generated on insert)
      if (editingShare) {
        payload.share_number = editingShare.share_number;
      }

      if (editingShare) {
        const { error } = await supabase
          .from("shares")
          .update(payload)
          .eq("id", editingShare.id);
        if (error) throw error;
        toast({ title: "Success", description: "Share updated successfully" });
      } else {
        const { error } = await supabase.from("shares").insert(payload);
        if (error) throw error;
        toast({ title: "Success", description: "Share issued successfully" });
      }

      setIsShareDialogOpen(false);
      resetShareForm();
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteShare = async () => {
    if (!deletingShareId) return;
    try {
      const { error } = await supabase.from("shares").delete().eq("id", deletingShareId);
      if (error) throw error;
      toast({ title: "Success", description: "Share deleted successfully" });
      setDeletingShareId(null);
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleCreateDividend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!family) return;
    
    try {
      const totalShareCount = shares.filter(s => s.is_active).reduce((sum, s) => sum + (s.share_count || 1), 0);
      const amountPerShare = parseFloat(dividendFormData.amount_per_share);
      const totalAmount = totalShareCount * amountPerShare;

      const { error } = await supabase.from("dividends").insert({
        family_id: family.id,
        period_year: parseInt(dividendFormData.period_year),
        period_quarter: dividendFormData.period_quarter ? parseInt(dividendFormData.period_quarter) : null,
        amount_per_share: amountPerShare,
        total_shares: totalShareCount,
        total_amount: totalAmount,
        source_description: dividendFormData.source_description || null,
        notes: dividendFormData.notes || null,
      });

      if (error) throw error;

      toast({ title: "Success", description: "Dividend declared successfully" });
      setIsDividendDialogOpen(false);
      setDividendFormData({
        period_year: new Date().getFullYear().toString(),
        period_quarter: "",
        amount_per_share: "",
        source_description: "",
        notes: "",
      });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const calculateMemberStats = () => {
    const memberStats = new Map<string, { count: number; value: number }>();
    shares.filter(s => s.is_active).forEach(share => {
      const memberName = share.family_members.profiles.full_name;
      const existing = memberStats.get(memberName) || { count: 0, value: 0 };
      const sc = share.share_count || 1;
      memberStats.set(memberName, {
        count: existing.count + sc,
        value: existing.value + sc * parseFloat(share.share_value.toString()),
      });
    });
    return memberStats;
  };

  const totalShareCount = shares.filter(s => s.is_active).reduce((sum, s) => sum + (s.share_count || 1), 0);
  const totalValue = shares.filter(s => s.is_active).reduce((sum, s) => sum + (s.share_count || 1) * parseFloat(s.share_value.toString()), 0);
  const totalDividendsPaid = dividends.filter(d => d.is_paid).reduce((sum, d) => sum + parseFloat(d.total_amount.toString()), 0);

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
            <h1 className="text-3xl font-bold">Shares & Dividends</h1>
          </div>
          <div className="flex items-center gap-3">
            <CurrencySelector />
            <LanguageSwitcher />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="text-sm text-muted-foreground">Active Shares</div>
            <div className="text-2xl font-bold">{totalShareCount}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-muted-foreground">Total Share Value</div>
            <div className="text-2xl font-bold">{formatAmount(totalValue)}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-muted-foreground">Dividends Paid</div>
            <div className="text-2xl font-bold">{formatAmount(totalDividendsPaid)}</div>
          </Card>
        </div>

        <Tabs defaultValue="shares" className="w-full">
          <TabsList>
            <TabsTrigger value="shares">Shares</TabsTrigger>
            <TabsTrigger value="dividends">Dividends</TabsTrigger>
            <TabsTrigger value="summary">Member Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="shares">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Share Register</h2>
              {canManageFinances && (
                <Dialog open={isShareDialogOpen} onOpenChange={(open) => { setIsShareDialogOpen(open); if (!open) resetShareForm(); }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Issue Share
                    </Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingShare ? "Edit Share" : "Issue New Share"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateOrUpdateShare} className="space-y-4">
                    <div>
                      <Label htmlFor="member">Member</Label>
                      <Select
                        value={shareFormData.member_id}
                        onValueChange={(value) => setShareFormData({ ...shareFormData, member_id: value })}
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
                    {editingShare && (
                    <div>
                      <Label>Share Number</Label>
                      <Input
                        value={editingShare.share_number}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Auto-generated</p>
                    </div>
                    )}
                    <div>
                      <Label htmlFor="share_count">Number of Shares</Label>
                      <Input
                        id="share_count"
                        type="number"
                        min="1"
                        value={shareFormData.share_count}
                        onChange={(e) => setShareFormData({ ...shareFormData, share_count: e.target.value })}
                        required
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Total: {formatAmount((parseInt(shareFormData.share_count) || 1) * (parseFloat(shareFormData.share_value) || 0))}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="purchase_date">Purchase Date</Label>
                      <Input
                        id="purchase_date"
                        type="date"
                        value={shareFormData.purchase_date}
                        onChange={(e) => setShareFormData({ ...shareFormData, purchase_date: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="share_value">Share Value (per share)</Label>
                      <Input
                        id="share_value"
                        type="number"
                        min="0"
                        step="1000"
                        value={shareFormData.share_value}
                        onChange={(e) => setShareFormData({ ...shareFormData, share_value: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes">Notes (optional)</Label>
                      <Textarea
                        id="notes"
                        value={shareFormData.notes}
                        onChange={(e) => setShareFormData({ ...shareFormData, notes: e.target.value })}
                      />
                    </div>
                    <Button type="submit" className="w-full">{editingShare ? "Update Share" : "Issue Share"}</Button>
                  </form>
                </DialogContent>
              </Dialog>
              )}
            </div>

            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4">Share #</th>
                      <th className="text-left p-4">Member</th>
                      <th className="text-right p-4">Qty</th>
                      <th className="text-left p-4">Purchase Date</th>
                      <th className="text-right p-4">Unit Value</th>
                      <th className="text-right p-4">Total Value</th>
                      <th className="text-center p-4">Status</th>
                      {canManageFinances && <th className="text-center p-4">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {shares.length === 0 ? (
                      <tr>
                        <td colSpan={canManageFinances ? 8 : 7} className="text-center p-8 text-muted-foreground">
                          No shares issued yet
                        </td>
                      </tr>
                    ) : (
                      shares.map((share) => {
                        const sc = share.share_count || 1;
                        const unitVal = parseFloat(share.share_value.toString());
                        return (
                          <tr key={share.id} className="border-b hover:bg-muted/50">
                            <td className="p-4 font-mono">{share.share_number}</td>
                            <td className="p-4">{share.family_members.profiles.full_name}</td>
                            <td className="p-4 text-right font-mono">{sc}</td>
                            <td className="p-4">{new Date(share.purchase_date).toLocaleDateString()}</td>
                            <td className="p-4 text-right font-mono">{formatAmount(unitVal)}</td>
                            <td className="p-4 text-right font-mono font-semibold">{formatAmount(sc * unitVal)}</td>
                            <td className="p-4 text-center">
                              {share.is_active ? (
                                <Badge variant="default">Active</Badge>
                              ) : (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </td>
                            {canManageFinances && (
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(share)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeletingShareId(share.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="dividends">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Dividend History</h2>
              {canManageFinances && (
                <Dialog open={isDividendDialogOpen} onOpenChange={setIsDividendDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Declare Dividend
                    </Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Declare Dividend</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateDividend} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="period_year">Year</Label>
                        <Input
                          id="period_year"
                          type="number"
                          value={dividendFormData.period_year}
                          onChange={(e) => setDividendFormData({ ...dividendFormData, period_year: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="period_quarter">Quarter (optional)</Label>
                        <Select
                          value={dividendFormData.period_quarter}
                          onValueChange={(value) => setDividendFormData({ ...dividendFormData, period_quarter: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select quarter" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Q1</SelectItem>
                            <SelectItem value="2">Q2</SelectItem>
                            <SelectItem value="3">Q3</SelectItem>
                            <SelectItem value="4">Q4</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="amount_per_share">Amount Per Share</Label>
                      <Input
                        id="amount_per_share"
                        type="number"
                        min="0"
                        step="100"
                        value={dividendFormData.amount_per_share}
                        onChange={(e) => setDividendFormData({ ...dividendFormData, amount_per_share: e.target.value })}
                        required
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        {totalShareCount} active shares × {formatAmount(parseFloat(dividendFormData.amount_per_share || "0"))} = {formatAmount(totalShareCount * parseFloat(dividendFormData.amount_per_share || "0"))} total
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="source">Source Description</Label>
                      <Input
                        id="source"
                        value={dividendFormData.source_description}
                        onChange={(e) => setDividendFormData({ ...dividendFormData, source_description: e.target.value })}
                        placeholder="e.g., Loan interest revenue"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dividend_notes">Notes (optional)</Label>
                      <Textarea
                        id="dividend_notes"
                        value={dividendFormData.notes}
                        onChange={(e) => setDividendFormData({ ...dividendFormData, notes: e.target.value })}
                      />
                    </div>
                    <Button type="submit" className="w-full">Declare Dividend</Button>
                  </form>
                </DialogContent>
              </Dialog>
              )}
            </div>

            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4">Period</th>
                      <th className="text-right p-4">Per Share</th>
                      <th className="text-right p-4">Total Shares</th>
                      <th className="text-right p-4">Total Amount</th>
                      <th className="text-center p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dividends.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center p-8 text-muted-foreground">
                          No dividends declared yet
                        </td>
                      </tr>
                    ) : (
                      dividends.map((dividend) => (
                        <tr key={dividend.id} className="border-b hover:bg-muted/50">
                          <td className="p-4">
                            {dividend.period_year} {dividend.period_quarter && `Q${dividend.period_quarter}`}
                          </td>
                          <td className="p-4 text-right font-mono">
                            {formatAmount(parseFloat(dividend.amount_per_share.toString()))}
                          </td>
                          <td className="p-4 text-right">{dividend.total_shares}</td>
                          <td className="p-4 text-right font-mono">
                            {formatAmount(parseFloat(dividend.total_amount.toString()))}
                          </td>
                          <td className="p-4 text-center">
                            {dividend.is_paid ? (
                              <Badge variant="default">Paid</Badge>
                            ) : (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="summary">
            <Card>
              <div className="p-4 border-b">
                <h2 className="text-xl font-semibold">Member Share Holdings</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4">Member</th>
                      <th className="text-right p-4">Shares Owned</th>
                      <th className="text-right p-4">Total Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(calculateMemberStats()).map(([memberName, stats]) => (
                      <tr key={memberName} className="border-b hover:bg-muted/50">
                        <td className="p-4">{memberName}</td>
                        <td className="p-4 text-right font-mono">{stats.count}</td>
                        <td className="p-4 text-right font-mono">
                          {formatAmount(stats.value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deletingShareId} onOpenChange={(open) => !open && setDeletingShareId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Share</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this share? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteShare} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

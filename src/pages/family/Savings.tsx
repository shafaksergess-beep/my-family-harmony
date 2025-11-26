import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { ArrowLeft, Plus, Download, DollarSign } from "lucide-react";
import { exportToCSV, formatSavingsForExport } from "@/lib/export";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface Saving {
  id: string;
  member_id: string;
  month: string;
  amount: number;
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

export default function FamilySavings() {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { family, canManageFinances, isLoading: authLoading } = useFamilyAuth(familySlug);
  const [loading, setLoading] = useState(true);
  const [savings, setSavings] = useState<Saving[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    member_id: "",
    month: new Date().toISOString().slice(0, 7),
    amount: family?.min_savings_amount?.toString() || "5000",
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

      // Fetch savings
      const { data: savingsData, error: savingsError } = await supabase
        .from("savings")
        .select("*")
        .eq("family_id", family.id)
        .order("month", { ascending: false });

      if (savingsError) throw savingsError;

      // Fetch family members
      const memberIds = [...new Set(savingsData?.map(s => s.member_id) || [])];
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

      const enrichedSavings = savingsData?.map(saving => ({
        ...saving,
        family_members: {
          id: saving.member_id,
          profiles: userIdToProfile.get(memberIdToUserId.get(saving.member_id)!) || { full_name: "Unknown" }
        }
      })) || [];

      setSavings(enrichedSavings as any);

      // Fetch all members for dropdown
      const { data: allMembersData, error: allMembersError } = await supabase
        .from("family_members")
        .select("id, user_id")
        .eq("family_id", family.id);

      if (allMembersError) throw allMembersError;

      const allUserIds = allMembersData?.map(m => m.user_id) || [];
      const { data: allProfilesData, error: allProfilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", allUserIds);

      if (allProfilesError) throw allProfilesError;

      const allUserIdToProfile = new Map(allProfilesData?.map(p => [p.id, p]) || []);
      const allEnrichedMembers = allMembersData?.map(member => ({
        id: member.id,
        profiles: allUserIdToProfile.get(member.user_id) || { full_name: "Unknown" }
      })) || [];

      setMembers(allEnrichedMembers as any);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!family) return;
      const monthDate = `${formData.month}-01`;
      
      const { error } = await supabase.from("savings").insert({
        family_id: family.id,
        member_id: formData.member_id,
        month: monthDate,
        amount: parseFloat(formData.amount),
        notes: formData.notes || null,
      });

      if (error) throw error;

      toast({ title: "Success", description: "Savings record added" });
      setIsDialogOpen(false);
      setFormData({
        member_id: "",
        month: new Date().toISOString().slice(0, 7),
        amount: family?.min_savings_amount?.toString() || "5000",
        notes: "",
      });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleExport = () => {
    const exportData = formatSavingsForExport(savings);
    exportToCSV(exportData, `savings_${new Date().toISOString().split('T')[0]}`);
    toast({ title: "Success", description: "Savings exported to CSV" });
  };

  const calculateStats = () => {
    const totalSavings = savings.reduce((sum, s) => sum + parseFloat(s.amount.toString()), 0);
    const uniqueMembers = new Set(savings.map(s => s.member_id)).size;
    const currentMonth = new Date().toISOString().slice(0, 7);
    const thisMonthSavings = savings.filter(s => s.month.startsWith(currentMonth));
    const thisMonthTotal = thisMonthSavings.reduce((sum, s) => sum + parseFloat(s.amount.toString()), 0);

    return { totalSavings, uniqueMembers, thisMonthTotal };
  };

  const stats = calculateStats();

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
            <h1 className="text-3xl font-bold">Individual Savings</h1>
          </div>
          <LanguageSwitcher />
        </div>

        <Card className="p-6 bg-primary/5 border-primary/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Recommended Monthly Savings (Optional)
              </p>
              <p className="text-2xl font-bold text-primary">
                {(family?.min_savings_amount || 5000).toLocaleString()} FCFA
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-primary opacity-50" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Savings are encouraged but not mandatory
          </p>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="text-sm text-muted-foreground">Total Savings</div>
            <div className="text-2xl font-bold">{stats.totalSavings.toLocaleString()} FCFA</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-muted-foreground">Active Savers</div>
            <div className="text-2xl font-bold">{stats.uniqueMembers}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-muted-foreground">This Month</div>
            <div className="text-2xl font-bold">{stats.thisMonthTotal.toLocaleString()} FCFA</div>
          </Card>
        </div>

        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Savings History</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            {canManageFinances && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Savings
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Savings Record</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                    <Label htmlFor="month">Month</Label>
                    <Input
                      id="month"
                      type="month"
                      value={formData.month}
                      onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="amount">
                      Amount (FCFA, recommended: {(family?.min_savings_amount || 5000).toLocaleString()})
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      min="0"
                      step="1000"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Any amount is acceptable; this is optional
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full">Add Savings</Button>
                </form>
              </DialogContent>
            </Dialog>
            )}
          </div>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">Member</th>
                  <th className="text-left p-4">Month</th>
                  <th className="text-right p-4">Amount</th>
                  <th className="text-left p-4">Notes</th>
                </tr>
              </thead>
              <tbody>
                {savings.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center p-8 text-muted-foreground">
                      No savings records yet
                    </td>
                  </tr>
                ) : (
                  savings.map((saving) => (
                    <tr key={saving.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">{saving.family_members.profiles.full_name}</td>
                      <td className="p-4">{new Date(saving.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</td>
                      <td className="p-4 text-right font-mono">{parseFloat(saving.amount.toString()).toLocaleString()} FCFA</td>
                      <td className="p-4 text-muted-foreground">{saving.notes || '-'}</td>
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

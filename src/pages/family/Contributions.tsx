import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { ArrowLeft, Plus, DollarSign, TrendingUp, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { exportToCSV } from "@/lib/export";
import BulkPaymentMenu from "@/components/BulkPaymentMenu";
import { contributionSchema, type ContributionInput } from "@/lib/validation";

interface Contribution {
  id: string;
  amount: number;
  contribution_date: string;
  payment_date: string | null;
  status: string;
  type: string;
  late_fine: number | null;
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

export default function Contributions() {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { family, canManageFinances, isLoading: authLoading } = useFamilyAuth(familySlug);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newContribution, setNewContribution] = useState({
    member_id: "",
    amount: "",
    contribution_date: format(new Date(), "yyyy-MM-dd"),
    type: "monthly",
    notes: "",
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (family) {
      fetchContributions();
      fetchMembers();
    }
  }, [family]);

  const fetchContributions = async () => {
    if (!family) return;
    
    try {
      // Fetch contributions
      const { data: contributionsData, error: contributionsError } = await supabase
        .from("contributions")
        .select("*")
        .eq("family_id", family.id)
        .order("contribution_date", { ascending: false });

      if (contributionsError) throw contributionsError;

      // Fetch family members
      const memberIds = [...new Set(contributionsData?.map(c => c.member_id) || [])];
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

      const enrichedContributions = contributionsData?.map(contribution => ({
        ...contribution,
        family_members: {
          profiles: userIdToProfile.get(memberIdToUserId.get(contribution.member_id)!) || { full_name: "Unknown" }
        }
      })) || [];

      setContributions(enrichedContributions as any);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error fetching contributions",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    if (!family) return;
    
    try {
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
      toast({
        variant: "destructive",
        title: "Error fetching members",
        description: error.message,
      });
    }
  };

  const handleAddContribution = async () => {
    setValidationErrors({});
    
    // Validate input
    const validationResult = contributionSchema.safeParse({
      memberId: newContribution.member_id,
      amount: parseFloat(newContribution.amount),
      contributionDate: newContribution.contribution_date,
      type: newContribution.type,
      notes: newContribution.notes || undefined,
    });

    if (!validationResult.success) {
      const errors: Record<string, string> = {};
      validationResult.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        errors[field] = err.message;
      });
      setValidationErrors(errors);
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please check the form for errors",
      });
      return;
    }

    try {
      const { error } = await supabase.from("contributions").insert({
        family_id: family.id,
        member_id: validationResult.data.memberId,
        amount: validationResult.data.amount,
        contribution_date: validationResult.data.contributionDate,
        type: validationResult.data.type,
        notes: validationResult.data.notes || null,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Contribution added",
        description: "The contribution has been recorded successfully.",
      });

      setIsDialogOpen(false);
      setNewContribution({
        member_id: "",
        amount: "",
        contribution_date: format(new Date(), "yyyy-MM-dd"),
        type: "monthly",
        notes: "",
      });
      setValidationErrors({});
      fetchContributions();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error adding contribution",
        description: error.message,
      });
    }
  };

  const handleMarkAsPaid = async (contributionId: string) => {
    try {
      const { error } = await supabase
        .from("contributions")
        .update({
          status: "paid",
          payment_date: new Date().toISOString(),
        })
        .eq("id", contributionId);

      if (error) throw error;

      toast({
        title: "Contribution updated",
        description: "Marked as paid successfully.",
      });

      fetchContributions();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating contribution",
        description: error.message,
      });
    }
  };

  const handleExport = () => {
    const csvData = contributions.map((c) => ({
      Member: c.family_members?.profiles?.full_name || "Unknown",
      Amount: c.amount,
      Date: format(new Date(c.contribution_date), "yyyy-MM-dd"),
      Type: c.type,
      Status: c.status,
      "Payment Date": c.payment_date ? format(new Date(c.payment_date), "yyyy-MM-dd") : "N/A",
      "Late Fine": c.late_fine || 0,
      Notes: c.notes || "",
    }));
    exportToCSV(csvData, "contributions.csv");
  };

  const totalContributions = contributions.reduce((sum, c) => sum + c.amount, 0);
  const paidContributions = contributions.filter((c) => c.status === "paid").reduce((sum, c) => sum + c.amount, 0);
  const pendingContributions = totalContributions - paidContributions;

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
                <h1 className="text-2xl font-bold text-foreground">Contributions</h1>
                <p className="text-sm text-muted-foreground">Track monthly contributions and payments</p>
              </div>
            </div>
            <div className="flex gap-2">
              {canManageFinances && (
                <BulkPaymentMenu
                  members={members}
                  familyId={family?.id || ''}
                  contributionDate={format(new Date(), "yyyy-MM-dd")}
                  onSuccess={fetchContributions}
                />
              )}
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              {canManageFinances && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" /> Add Contribution
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Record New Contribution</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Member</Label>
                        <Select 
                          value={newContribution.member_id} 
                          onValueChange={(value) => {
                            setNewContribution({ ...newContribution, member_id: value });
                            setValidationErrors({ ...validationErrors, memberId: "" });
                          }}
                        >
                          <SelectTrigger className={validationErrors.memberId ? "border-red-500" : ""}>
                            <SelectValue placeholder="Select member" />
                          </SelectTrigger>
                          <SelectContent>
                            {members.map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.profiles?.full_name || "Unknown"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {validationErrors.memberId && (
                          <p className="text-sm text-red-500 mt-1">{validationErrors.memberId}</p>
                        )}
                      </div>
                      <div>
                        <Label>Amount (FCFA)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newContribution.amount}
                          onChange={(e) => {
                            setNewContribution({ ...newContribution, amount: e.target.value });
                            setValidationErrors({ ...validationErrors, amount: "" });
                          }}
                          className={validationErrors.amount ? "border-red-500" : ""}
                        />
                        {validationErrors.amount && (
                          <p className="text-sm text-red-500 mt-1">{validationErrors.amount}</p>
                        )}
                      </div>
                      <div>
                        <Label>Date</Label>
                        <Input
                          type="date"
                          value={newContribution.contribution_date}
                          onChange={(e) => {
                            setNewContribution({ ...newContribution, contribution_date: e.target.value });
                            setValidationErrors({ ...validationErrors, contributionDate: "" });
                          }}
                          className={validationErrors.contributionDate ? "border-red-500" : ""}
                        />
                        {validationErrors.contributionDate && (
                          <p className="text-sm text-red-500 mt-1">{validationErrors.contributionDate}</p>
                        )}
                      </div>
                      <div>
                        <Label>Type</Label>
                        <Select 
                          value={newContribution.type} 
                          onValueChange={(value) => {
                            setNewContribution({ ...newContribution, type: value });
                            setValidationErrors({ ...validationErrors, type: "" });
                          }}
                        >
                          <SelectTrigger className={validationErrors.type ? "border-red-500" : ""}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="special">Special</SelectItem>
                            <SelectItem value="fine">Fine</SelectItem>
                            <SelectItem value="loan_repayment">Loan Repayment</SelectItem>
                          </SelectContent>
                        </Select>
                        {validationErrors.type && (
                          <p className="text-sm text-red-500 mt-1">{validationErrors.type}</p>
                        )}
                      </div>
                      <div>
                        <Label>Notes (optional)</Label>
                        <Textarea
                          maxLength={500}
                          value={newContribution.notes}
                          onChange={(e) => {
                            setNewContribution({ ...newContribution, notes: e.target.value });
                            setValidationErrors({ ...validationErrors, notes: "" });
                          }}
                          className={validationErrors.notes ? "border-red-500" : ""}
                        />
                        {validationErrors.notes && (
                          <p className="text-sm text-red-500 mt-1">{validationErrors.notes}</p>
                        )}
                      </div>
                      <Button onClick={handleAddContribution} className="w-full">
                        Add Contribution
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contributions</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalContributions.toLocaleString()} FCFA</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{paidContributions.toLocaleString()} FCFA</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{pendingContributions.toLocaleString()} FCFA</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Contribution History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contributions.map((contribution) => (
                <div key={contribution.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{contribution.family_members?.profiles?.full_name || "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(contribution.contribution_date), "PPP")} • {contribution.type}
                    </p>
                    {contribution.notes && <p className="text-sm text-muted-foreground">{contribution.notes}</p>}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold">{contribution.amount.toLocaleString()} FCFA</p>
                      {contribution.late_fine && contribution.late_fine > 0 && (
                        <p className="text-sm text-red-600">+{contribution.late_fine} fine</p>
                      )}
                    </div>
                    {contribution.status === "pending" && canManageFinances ? (
                      <Button size="sm" onClick={() => handleMarkAsPaid(contribution.id)}>
                        Mark Paid
                      </Button>
                    ) : (
                      <Badge variant={contribution.status === "paid" ? "default" : "secondary"}>
                        {contribution.status}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

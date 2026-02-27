import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Calendar, DollarSign, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface PaymentPlan {
  id: string;
  member_id: string;
  total_amount: number;
  amount_paid: number;
  installment_amount: number;
  frequency: string;
  start_date: string;
  end_date: string | null;
  status: string;
  notes: string | null;
  family_members: {
    profiles: {
      full_name: string;
    };
  };
}

interface Member {
  id: string;
  profiles: {
    full_name: string;
  };
}

export default function PaymentPlans() {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    member_id: "",
    total_amount: "",
    installment_amount: "",
    frequency: "monthly",
    start_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Get family
      const { data: family } = await supabase
        .from("families")
        .select("*")
        .eq("slug", familySlug)
        .single();

      if (!family) return;

      // Fetch payment plans
      const { data: plansData } = await supabase
        .from("payment_plans")
        .select(`
          *,
          family_members!inner(
            user_id
          )
        `)
        .eq("family_id", family.id)
        .order("created_at", { ascending: false });

      // Get member names separately
      if (plansData && plansData.length > 0) {
        const userIds = plansData.map((p: Record<string, unknown>) => (p.family_members as { user_id: string }).user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        
        const enrichedPlans = plansData.map((plan: Record<string, unknown>) => ({
          ...plan,
          family_members: {
            profiles: profilesMap.get((plan.family_members as { user_id: string }).user_id) || { full_name: "Unknown" }
          }
        }));
        
        setPlans(enrichedPlans as unknown as PaymentPlan[]);
      } else {
        setPlans([]);
      }

      // Fetch members
      const { data: membersData } = await supabase
        .from("family_members")
        .select("id, user_id")
        .eq("family_id", family.id);

      if (membersData && membersData.length > 0) {
        const userIds = membersData.map(m => m.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        
        const enrichedMembers = membersData.map(member => ({
          id: member.id,
          profiles: profilesMap.get(member.user_id) || { full_name: "Unknown" }
        }));
        
        setMembers(enrichedMembers as unknown as Member[]);
      } else {
        setMembers([]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load payment plans");
    } finally {
      setLoading(false);
    }
  }, [familySlug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: family } = await supabase
        .from("families")
        .select("id")
        .eq("slug", familySlug)
        .single();

      if (!family) return;

      const { error } = await supabase.from("payment_plans").insert({
        family_id: family.id,
        member_id: formData.member_id,
        total_amount: Number(formData.total_amount),
        installment_amount: Number(formData.installment_amount),
        frequency: formData.frequency,
        start_date: formData.start_date,
        notes: formData.notes || null,
        status: "active",
      });

      if (error) throw error;

      toast.success("Payment plan created successfully");
      setDialogOpen(false);
      setFormData({
        member_id: "",
        total_amount: "",
        installment_amount: "",
        frequency: "monthly",
        start_date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      loadData();
    } catch (error) {
      console.error("Error creating plan:", error);
      toast.error("Failed to create payment plan");
    }
  };

  const handleRecordPayment = async (planId: string, currentPaid: number, installmentAmount: number, totalAmount: number) => {
    try {
      const newAmountPaid = currentPaid + installmentAmount;
      const isCompleted = newAmountPaid >= totalAmount;

      const { error } = await supabase
        .from("payment_plans")
        .update({
          amount_paid: newAmountPaid,
          status: isCompleted ? "completed" : "active",
          end_date: isCompleted ? new Date().toISOString().split("T")[0] : null,
        })
        .eq("id", planId);

      if (error) throw error;

      toast.success("Payment recorded successfully");
      loadData();
    } catch (error) {
      console.error("Error recording payment:", error);
      toast.error("Failed to record payment");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "XAF",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const calculateProgress = (paid: number, total: number) => {
    return Math.min((paid / total) * 100, 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(`/family/${familySlug}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Payment Plans</h1>
            <p className="text-muted-foreground">Manage installment payment schedules</p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleCreatePlan}>
              <DialogHeader>
                <DialogTitle>Create Payment Plan</DialogTitle>
                <DialogDescription>Set up an installment payment schedule for a member</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="member">Member</Label>
                  <Select value={formData.member_id} onValueChange={(value) => setFormData({ ...formData, member_id: value })} required>
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

                <div className="grid gap-2">
                  <Label htmlFor="total_amount">Total Amount (FCFA)</Label>
                  <Input
                    id="total_amount"
                    type="number"
                    value={formData.total_amount}
                    onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="installment_amount">Installment Amount (FCFA)</Label>
                  <Input
                    id="installment_amount"
                    type="number"
                    value={formData.installment_amount}
                    onChange={(e) => setFormData({ ...formData, installment_amount: e.target.value })}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="frequency">Payment Frequency</Label>
                  <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional information..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Create Payment Plan</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Payment Plans List */}
      <div className="grid gap-4">
        {plans.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No payment plans yet</p>
            </CardContent>
          </Card>
        ) : (
          plans.map((plan) => {
            const progress = calculateProgress(Number(plan.amount_paid), Number(plan.total_amount));
            const remaining = Number(plan.total_amount) - Number(plan.amount_paid);
            const installmentsRemaining = Math.ceil(remaining / Number(plan.installment_amount));

            return (
              <Card key={plan.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{plan.family_members.profiles.full_name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4" />
                        Started: {new Date(plan.start_date).toLocaleDateString()}
                        {plan.frequency && ` • ${plan.frequency.charAt(0).toUpperCase() + plan.frequency.slice(1)}`}
                      </CardDescription>
                    </div>
                    <Badge variant={plan.status === "completed" ? "default" : plan.status === "active" ? "secondary" : "outline"}>
                      {plan.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progress: {progress.toFixed(1)}%</span>
                      <span>
                        {formatCurrency(Number(plan.amount_paid))} / {formatCurrency(Number(plan.total_amount))}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Installment Amount</p>
                      <p className="font-semibold">{formatCurrency(Number(plan.installment_amount))}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Remaining</p>
                      <p className="font-semibold">{formatCurrency(remaining)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Installments Left</p>
                      <p className="font-semibold">{installmentsRemaining}</p>
                    </div>
                    {plan.end_date && (
                      <div>
                        <p className="text-muted-foreground">Completed On</p>
                        <p className="font-semibold">{new Date(plan.end_date).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>

                  {plan.notes && (
                    <div>
                      <p className="text-sm text-muted-foreground">Notes:</p>
                      <p className="text-sm mt-1">{plan.notes}</p>
                    </div>
                  )}

                  {plan.status === "active" && (
                    <Button
                      onClick={() => handleRecordPayment(plan.id, Number(plan.amount_paid), Number(plan.installment_amount), Number(plan.total_amount))}
                      className="w-full"
                    >
                      Record Payment ({formatCurrency(Number(plan.installment_amount))})
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { ArrowLeft, Plus, CheckCircle2, XCircle, DollarSign, AlertTriangle, TrendingUp, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useCurrency } from "@/context/CurrencyContext";
import { CurrencySelector } from "@/components/CurrencySelector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoanPaymentForm } from "@/components/LoanPaymentForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileLoans } from "@/components/mobile";

interface Loan {
  id: string;
  amount: number;
  interest_rate: number;
  term_months: number;
  status: string;
  purpose: string;
  amount_paid: number | null;
  interest_paid: number | null;
  approved_at: string | null;
  disbursed_at: string | null;
  due_date: string | null;
  notes: string | null;
  created_at: string;
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

export default function Loans() {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { family, canManageLoans, isLoading: authLoading } = useFamilyAuth(familySlug);
  const { formatAmount } = useCurrency();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newLoan, setNewLoan] = useState({
    member_id: "",
    amount: "",
    purpose: "",
    term_months: "4",
    notes: "",
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (family?.id) {
      fetchLoans();
      fetchMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family?.id]);

  const fetchLoans = async () => {
    try {
      const { data, error } = await supabase
        .from("loans")
        .select(`
          *,
          family_members(
            profiles(full_name)
          )
        `)
        .eq("family_id", family!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLoans((data as unknown as Loan[]) || []);
    } catch (error) {
      const err = error as Error;
      toast({
        variant: "destructive",
        title: "Error fetching loans",
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("family_members")
        .select("id, profiles(full_name)")
        .eq("family_id", family!.id);

      if (error) throw error;
      setMembers((data as unknown as Member[]) || []);
    } catch (error) {
      const err = error as Error;
      toast({
        variant: "destructive",
        title: "Error fetching members",
        description: err.message,
      });
    }
  };

  const handleRequestLoan = async () => {
    if (!family) return;
    setValidationErrors({});
    
    // Check for ongoing loans
    const hasOngoingLoan = loans.some(
      (loan) => 
        loan.family_members?.profiles?.full_name && 
        loan.status === "disbursed" && 
        members.find(m => m.id === newLoan.member_id)?.profiles?.full_name === loan.family_members.profiles.full_name
    );

    if (hasOngoingLoan) {
      toast({
        variant: "destructive",
        title: "Loan Request Denied",
        description: "This member already has an ongoing loan. Please clear existing loan before requesting a new one.",
      });
      return;
    }

    const minLoanAmount = family?.min_loan_amount || 50000;
    const amount = parseFloat(newLoan.amount);

    // Manual validation with dynamic minimum
    if (!newLoan.member_id) {
      setValidationErrors({ memberId: "Member is required" });
      toast({ variant: "destructive", title: "Validation Error", description: "Please select a member" });
      return;
    }
    if (!newLoan.amount || amount < minLoanAmount) {
      setValidationErrors({ amount: `Minimum loan amount is ${minLoanAmount.toLocaleString()} FCFA` });
      toast({ variant: "destructive", title: "Validation Error", description: `Minimum loan amount is ${minLoanAmount.toLocaleString()} FCFA` });
      return;
    }
    if (!newLoan.purpose || newLoan.purpose.length < 10) {
      setValidationErrors({ purpose: "Purpose must be at least 10 characters" });
      toast({ variant: "destructive", title: "Validation Error", description: "Please provide a detailed purpose" });
      return;
    }

    try {
      const { data: newLoanData, error } = await supabase.from("loans").insert({
        family_id: family!.id,
        member_id: newLoan.member_id,
        amount: parseFloat(newLoan.amount),
        purpose: newLoan.purpose,
        term_months: parseInt(newLoan.term_months),
        interest_rate: family?.loan_interest_rate || 2.5,
        notes: newLoan.notes || null,
        status: "pending",
      }).select().single();

      if (error) throw error;

      // Get member name for notification
      const { data: memberData } = await supabase
        .from("family_members")
        .select("user_id")
        .eq("id", newLoan.member_id)
        .single();

      if (memberData) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", memberData.user_id)
          .single();

        // Send notification to loan committee and family head
        try {
          await supabase.functions.invoke('send-notification', {
            body: {
              familyId: family.id,
              type: 'loan_requested',
              title: 'New Loan Request',
              message: `${profileData?.full_name || 'A member'} requested a loan of ${formatAmount(parseFloat(newLoan.amount))}. Purpose: ${newLoan.purpose}`,
              actionUrl: `/family/${familySlug}/loans`
            }
          });
        } catch (notifError) {
          console.error('Failed to send notification:', notifError);
          // Don't fail the loan creation if notification fails
        }
      }

      toast({
        title: "Loan request submitted",
        description: "The loan request has been submitted for approval.",
      });

      setIsDialogOpen(false);
      setNewLoan({
        member_id: "",
        amount: "",
        purpose: "",
        term_months: "4",
        notes: "",
      });
      setValidationErrors({});
      fetchLoans();
    } catch (error) {
      const err = error as Error;
      toast({
        variant: "destructive",
        title: "Error requesting loan",
        description: err.message,
      });
    }
  };

  const handleApproveLoan = async (loanId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("loans")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: user.id,
        })
        .eq("id", loanId);

      if (error) throw error;

      toast({
        title: "Loan approved",
        description: "The loan has been approved successfully.",
      });

      fetchLoans();
    } catch (error) {
      const err = error as Error;
      toast({
        variant: "destructive",
        title: "Error approving loan",
        description: err.message,
      });
    }
  };

  const handleDisburseLoan = async (loanId: string, amount: number, termMonths: number) => {
    try {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + termMonths);

      const { error } = await supabase
        .from("loans")
        .update({
          status: "disbursed",
          disbursed_at: new Date().toISOString(),
          due_date: dueDate.toISOString().split("T")[0],
        })
        .eq("id", loanId);

      if (error) throw error;

      toast({
        title: "Loan disbursed",
        description: "The loan has been disbursed successfully.",
      });

      fetchLoans();
    } catch (error) {
      const err = error as Error;
      toast({
        variant: "destructive",
        title: "Error disbursing loan",
        description: err.message,
      });
    }
  };

  const calculateTotalOwed = (loan: Loan) => {
    const principal = loan.amount;
    const interest = (principal * loan.interest_rate * loan.term_months) / 100;
    const totalOwed = principal + interest;
    const totalPaid = (loan.amount_paid || 0) + (loan.interest_paid || 0);
    return { totalOwed, totalPaid, remaining: totalOwed - totalPaid };
  };

  const getDeadlineStatus = (loan: Loan) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const deadline = new Date(currentYear, 10, 30); // November 30 of current year
    const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (loan.status === 'repaid') return null;
    if (daysUntilDeadline < 0) return { type: 'overdue', message: 'Overdue - must be cleared by November' };
    if (daysUntilDeadline < 30) return { type: 'urgent', message: `${daysUntilDeadline} days until deadline` };
    if (daysUntilDeadline < 60) return { type: 'warning', message: `${daysUntilDeadline} days until deadline` };
    return null;
  };

  const totalLoansOut = loans.filter((l) => l.status === "disbursed").reduce((sum, l) => sum + l.amount, 0);
  const totalInterestExpected = loans
    .filter((l) => l.status === "disbursed")
    .reduce((sum, l) => sum + (l.amount * l.interest_rate * l.term_months) / 100, 0);

  const isMobile = useIsMobile();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  // Render mobile version on mobile devices
  if (isMobile) {
    return <MobileLoans />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/family/${family?.id}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Loan Management</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Request Loan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request New Loan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Member</Label>
                <Select 
                  value={newLoan.member_id} 
                  onValueChange={(value) => {
                    setNewLoan({ ...newLoan, member_id: value });
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
                <Label>Amount (FCFA, minimum {(family?.min_loan_amount || 50000).toLocaleString()})</Label>
                <Input
                  type="number"
                  min={family?.min_loan_amount || 50000}
                  step="1000"
                  value={newLoan.amount}
                  onChange={(e) => {
                    setNewLoan({ ...newLoan, amount: e.target.value });
                    setValidationErrors({ ...validationErrors, amount: "" });
                  }}
                  className={validationErrors.amount ? "border-red-500" : ""}
                />
                {validationErrors.amount && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.amount}</p>
                )}
              </div>
              <div>
                <Label>Purpose (min 10 characters)</Label>
                <Input
                  value={newLoan.purpose}
                  onChange={(e) => {
                    setNewLoan({ ...newLoan, purpose: e.target.value });
                    setValidationErrors({ ...validationErrors, purpose: "" });
                  }}
                  placeholder="Reason for loan"
                  maxLength={500}
                  className={validationErrors.purpose ? "border-red-500" : ""}
                />
                {validationErrors.purpose && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.purpose}</p>
                )}
              </div>
              <div>
                <Label>Term (months, max 12)</Label>
                <Select 
                  value={newLoan.term_months} 
                  onValueChange={(value) => {
                    setNewLoan({ ...newLoan, term_months: value });
                    setValidationErrors({ ...validationErrors, termMonths: "" });
                  }}
                >
                  <SelectTrigger className={validationErrors.termMonths ? "border-red-500" : ""}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 month</SelectItem>
                    <SelectItem value="2">2 months</SelectItem>
                    <SelectItem value="3">3 months</SelectItem>
                    <SelectItem value="4">4 months (default)</SelectItem>
                    <SelectItem value="6">6 months</SelectItem>
                    <SelectItem value="12">12 months</SelectItem>
                  </SelectContent>
                </Select>
                {validationErrors.termMonths && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.termMonths}</p>
                )}
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Textarea
                  value={newLoan.notes}
                  onChange={(e) => {
                    setNewLoan({ ...newLoan, notes: e.target.value });
                    setValidationErrors({ ...validationErrors, notes: "" });
                  }}
                  maxLength={500}
                  className={validationErrors.notes ? "border-red-500" : ""}
                />
                {validationErrors.notes && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.notes}</p>
                )}
              </div>
              <div className="bg-muted p-3 rounded">
                <p className="text-sm">
                  Interest Rate: {family?.loan_interest_rate || 2.5}% per month<br />
                  {newLoan.amount && newLoan.term_months && (
                    <>
                      Estimated Interest: {((parseFloat(newLoan.amount) * (family?.loan_interest_rate || 2.5) * parseInt(newLoan.term_months)) / 100).toLocaleString()} FCFA<br />
                      Total Repayment: {(parseFloat(newLoan.amount) + (parseFloat(newLoan.amount) * (family?.loan_interest_rate || 2.5) * parseInt(newLoan.term_months)) / 100).toLocaleString()} FCFA
                    </>
                  )}
                </p>
              </div>
              <Button onClick={handleRequestLoan} className="w-full">
                Submit Loan Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Alert variant="default" className="border-orange-500">
        <AlertTriangle className="h-4 w-4 text-orange-500" />
        <AlertDescription>
          <strong>Loan Deadline: November 30, {new Date().getFullYear()}</strong>
          <p className="mt-1 text-sm">
            All loans and interest must be cleared by November of the current year. Unpaid loans may be recovered from Njangi, assistance, or other entitlements.
          </p>
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Active Loans</div>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold mt-2">{totalLoansOut.toLocaleString()} FCFA</div>
            <p className="text-xs text-muted-foreground mt-1">{loans.filter((l) => l.status === "disbursed").length} loans</p>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Expected Interest</div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold mt-2">{totalInterestExpected.toLocaleString()} FCFA</div>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Pending Requests</div>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold mt-2">{loans.filter((l) => l.status === "pending").length}</div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-6 space-y-6">
          <h2 className="text-xl font-semibold">Loan Records</h2>
          <div className="space-y-4">
            {loans.map((loan) => {
              const { totalOwed, totalPaid, remaining } = calculateTotalOwed(loan);
              return (
                <div key={loan.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                  <div className="space-y-1">
                      <p className="font-medium">{loan.family_members?.profiles?.full_name || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground">{loan.purpose}</p>
                      <p className="text-xs text-muted-foreground">
                        Requested: {format(new Date(loan.created_at), "PPP")}
                      </p>
                    </div>
                    <Badge
                      variant={
                        loan.status === "disbursed"
                          ? "default"
                          : loan.status === "approved"
                          ? "secondary"
                          : loan.status === "pending"
                          ? "outline"
                          : "destructive"
                      }
                    >
                      {loan.status}
                    </Badge>
                    {getDeadlineStatus(loan) && (
                      <Badge 
                        variant={getDeadlineStatus(loan)!.type === 'overdue' ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {getDeadlineStatus(loan)!.message}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Principal</p>
                      <p className="font-medium">{loan.amount.toLocaleString()} FCFA</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Owed</p>
                      <p className="font-medium">{totalOwed.toLocaleString()} FCFA</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Term</p>
                      <p className="font-medium">{loan.term_months} months @ {loan.interest_rate}%</p>
                    </div>
                    {loan.due_date && (
                      <div>
                        <p className="text-muted-foreground">Due Date</p>
                        <p className="font-medium">{format(new Date(loan.due_date), "PPP")}</p>
                      </div>
                    )}
                  </div>
                   {loan.status === "disbursed" && (
                    <div className="space-y-2">
                      <div className="bg-muted p-2 rounded text-sm">
                        <p>Paid: {totalPaid.toLocaleString()} FCFA | Remaining: {remaining.toLocaleString()} FCFA</p>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="w-full">
                            Record Payment
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Record Loan Payment</DialogTitle>
                          </DialogHeader>
                          <LoanPaymentForm 
                            loan={loan} 
                            onSuccess={fetchLoans}
                            totalOwed={totalOwed}
                            totalPaid={totalPaid}
                            remaining={remaining}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                  {canManageLoans && (
                    <div className="flex gap-2">
                      {loan.status === "pending" && (
                        <Button size="sm" onClick={() => handleApproveLoan(loan.id)}>
                          Approve
                        </Button>
                      )}
                      {loan.status === "approved" && (
                        <Button size="sm" onClick={() => handleDisburseLoan(loan.id, loan.amount, loan.term_months)}>
                          Disburse
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}

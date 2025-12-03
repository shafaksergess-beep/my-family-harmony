import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { haptics } from "@/lib/haptics";
import { OfflineIndicator } from "./OfflineIndicator";
import { LoanCard } from "./LoanCard";
import { LoanCalculator } from "./LoanCalculator";
import { RepaymentSchedule } from "./RepaymentSchedule";
import {
  ArrowLeft,
  Plus,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calculator,
  History,
  Users,
  RefreshCw,
} from "lucide-react";

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

export function MobileLoans() {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { family, canManageLoans, userId, isLoading: authLoading } = useFamilyAuth(familySlug);

  const [loans, setLoans] = useState<Loan[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("my-loans");
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);

  // Sheet states
  const [showNewLoanSheet, setShowNewLoanSheet] = useState(false);
  const [showCalculatorSheet, setShowCalculatorSheet] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [showScheduleSheet, setShowScheduleSheet] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  // New loan form
  const [newLoan, setNewLoan] = useState({
    member_id: "",
    amount: "",
    purpose: "",
    term_months: "4",
    notes: "",
  });
  const [calculatedValues, setCalculatedValues] = useState<any>(null);

  useEffect(() => {
    if (family?.id) {
      fetchLoans();
      fetchMembers();
    }
  }, [family?.id]);

  useEffect(() => {
    if (family?.id && userId) {
      fetchCurrentMember();
    }
  }, [family?.id, userId]);

  const fetchCurrentMember = async () => {
    if (!family?.id || !userId) return;
    const { data } = await supabase
      .from("family_members")
      .select("id")
      .eq("family_id", family.id)
      .eq("user_id", userId)
      .single();
    if (data) setCurrentMemberId(data.id);
  };

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
      setLoans(data as any || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
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
      setMembers(data as any || []);
    } catch (error) {
      console.error("Error fetching members:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    haptics.light();
    await fetchLoans();
    setRefreshing(false);
    haptics.success();
  };

  const handleRequestLoan = async () => {
    if (!family) return;
    haptics.light();

    const minLoanAmount = family?.min_loan_amount || 50000;
    const amount = parseFloat(newLoan.amount || calculatedValues?.amount || "0");

    if (!newLoan.member_id) {
      toast({ variant: "destructive", title: "Error", description: "Please select a member" });
      haptics.error();
      return;
    }
    if (amount < minLoanAmount) {
      toast({ variant: "destructive", title: "Error", description: `Minimum loan is ${minLoanAmount.toLocaleString()} FCFA` });
      haptics.error();
      return;
    }
    if (!newLoan.purpose || newLoan.purpose.length < 10) {
      toast({ variant: "destructive", title: "Error", description: "Please provide a detailed purpose" });
      haptics.error();
      return;
    }

    // Check for ongoing loans
    const memberLoans = loans.filter(
      (loan) => loan.family_members?.profiles?.full_name === 
        members.find(m => m.id === newLoan.member_id)?.profiles?.full_name &&
        loan.status === "disbursed"
    );

    if (memberLoans.length > 0) {
      toast({
        variant: "destructive",
        title: "Loan Request Denied",
        description: "This member already has an ongoing loan",
      });
      haptics.error();
      return;
    }

    try {
      const { data: newLoanData, error } = await supabase.from("loans").insert({
        family_id: family.id,
        member_id: newLoan.member_id,
        amount,
        purpose: newLoan.purpose,
        term_months: parseInt(newLoan.term_months || calculatedValues?.termMonths || "4"),
        interest_rate: family.loan_interest_rate || 2.5,
        notes: newLoan.notes || null,
        status: "pending",
      }).select().single();

      if (error) throw error;

      // Send notification
      try {
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

          await supabase.functions.invoke('send-loan-notification', {
            body: {
              loanId: newLoanData.id,
              familyId: family.id,
              memberName: profileData?.full_name || 'Unknown',
              amount,
              purpose: newLoan.purpose,
            }
          });
        }
      } catch (e) {
        console.error("Notification error:", e);
      }

      toast({
        title: "Loan Request Submitted",
        description: "Your request is pending approval",
      });
      haptics.success();

      setShowNewLoanSheet(false);
      setNewLoan({ member_id: "", amount: "", purpose: "", term_months: "4", notes: "" });
      fetchLoans();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      haptics.error();
    }
  };

  const myLoans = loans.filter(
    (loan) => loan.family_members?.profiles?.full_name === 
      members.find(m => m.id === currentMemberId)?.profiles?.full_name
  );

  const pendingLoans = loans.filter((loan) => loan.status === "pending");
  const activeLoans = loans.filter((loan) => loan.status === "disbursed");

  const totalActive = activeLoans.reduce((sum, l) => sum + l.amount, 0);
  const totalInterestExpected = activeLoans.reduce(
    (sum, l) => sum + (l.amount * l.interest_rate * l.term_months) / 100,
    0
  );

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <OfflineIndicator />
      
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                haptics.light();
                navigate(`/family/${familySlug}`);
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Loans</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                haptics.light();
                handleRefresh();
              }}
              disabled={refreshing}
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                haptics.light();
                setShowCalculatorSheet(true);
              }}
            >
              <Calculator className="h-5 w-5" />
            </Button>
            <Button
              size="sm"
              onClick={() => {
                haptics.light();
                setShowNewLoanSheet(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Apply
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 py-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs">Active Loans</span>
              </div>
              <div className="text-xl font-bold">{totalActive.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">
                {activeLoans.length} loan{activeLoans.length !== 1 ? "s" : ""}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs">Expected Interest</span>
              </div>
              <div className="text-xl font-bold text-orange-600">
                {totalInterestExpected.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">FCFA</div>
            </CardContent>
          </Card>
        </div>

        {/* Deadline Warning */}
        <Card className="border-orange-500/50 bg-orange-500/5">
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0" />
            <div>
              <div className="font-medium text-sm">Deadline: Nov 30, {new Date().getFullYear()}</div>
              <div className="text-xs text-muted-foreground">
                All loans must be cleared by November
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="my-loans" className="text-xs">
            My Loans
          </TabsTrigger>
          <TabsTrigger value="all-loans" className="text-xs">
            All Loans
          </TabsTrigger>
          {canManageLoans && (
            <TabsTrigger value="pending" className="text-xs relative">
              Pending
              {pendingLoans.length > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center">
                  {pendingLoans.length}
                </Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my-loans" className="space-y-3 mt-4">
          {myLoans.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>You have no loans</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setShowNewLoanSheet(true)}
                >
                  Apply for a Loan
                </Button>
              </CardContent>
            </Card>
          ) : (
            myLoans.map((loan) => (
              <LoanCard
                key={loan.id}
                loan={{
                  ...loan,
                  member_name: loan.family_members?.profiles?.full_name,
                }}
                onMakePayment={() => {
                  setSelectedLoan(loan);
                  setShowPaymentSheet(true);
                }}
                onViewDetails={() => {
                  setSelectedLoan(loan);
                  setShowScheduleSheet(true);
                }}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="all-loans" className="space-y-3 mt-4">
          {loans.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No loans in this family</p>
              </CardContent>
            </Card>
          ) : (
            loans.map((loan) => (
              <LoanCard
                key={loan.id}
                loan={{
                  ...loan,
                  member_name: loan.family_members?.profiles?.full_name,
                }}
                showMemberName
                onViewDetails={() => {
                  setSelectedLoan(loan);
                  setShowScheduleSheet(true);
                }}
              />
            ))
          )}
        </TabsContent>

        {canManageLoans && (
          <TabsContent value="pending" className="space-y-3 mt-4">
            {pendingLoans.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No pending loan requests</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4" />
                  <span className="text-sm text-muted-foreground">
                    {pendingLoans.length} request{pendingLoans.length !== 1 ? "s" : ""} awaiting review
                  </span>
                </div>
                {pendingLoans.map((loan) => (
                  <LoanCard
                    key={loan.id}
                    loan={{
                      ...loan,
                      member_name: loan.family_members?.profiles?.full_name,
                    }}
                    showMemberName
                    onViewDetails={() => {
                      haptics.light();
                      navigate(`/family/${familySlug}/loan-committee`);
                    }}
                  />
                ))}
                <Button
                  className="w-full"
                  onClick={() => navigate(`/family/${familySlug}/loan-committee`)}
                >
                  Go to Loan Committee Dashboard
                </Button>
              </>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Quick Actions */}
      <div className="px-4 py-4 space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => {
            haptics.light();
            navigate(`/family/${familySlug}/loan-history`);
          }}
        >
          <History className="h-4 w-4 mr-2" />
          View Loan History & Reports
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => {
            haptics.light();
            navigate(`/family/${familySlug}/loan-analytics`);
          }}
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Loan Analytics
        </Button>
      </div>

      {/* New Loan Sheet */}
      <Sheet open={showNewLoanSheet} onOpenChange={setShowNewLoanSheet}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Apply for a Loan</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <LoanCalculator
              minAmount={family?.min_loan_amount || 50000}
              maxAmount={5000000}
              interestRate={family?.loan_interest_rate || 2.5}
              onCalculate={(values) => {
                setCalculatedValues(values);
                setNewLoan((prev) => ({
                  ...prev,
                  amount: values.amount.toString(),
                  term_months: values.termMonths.toString(),
                }));
              }}
            />

            <div className="space-y-3">
              <div>
                <Label>Member</Label>
                <Select
                  value={newLoan.member_id}
                  onValueChange={(value) => setNewLoan({ ...newLoan, member_id: value })}
                >
                  <SelectTrigger>
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
              </div>

              <div>
                <Label>Purpose (min 10 characters)</Label>
                <Input
                  value={newLoan.purpose}
                  onChange={(e) => setNewLoan({ ...newLoan, purpose: e.target.value })}
                  placeholder="Why do you need this loan?"
                />
              </div>

              <div>
                <Label>Additional Notes (optional)</Label>
                <Textarea
                  value={newLoan.notes}
                  onChange={(e) => setNewLoan({ ...newLoan, notes: e.target.value })}
                  placeholder="Any additional information..."
                  rows={3}
                />
              </div>

              <Button className="w-full" onClick={handleRequestLoan}>
                Submit Loan Request
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Calculator Sheet */}
      <Sheet open={showCalculatorSheet} onOpenChange={setShowCalculatorSheet}>
        <SheetContent side="bottom" className="h-[70vh]">
          <SheetHeader>
            <SheetTitle>Loan Calculator</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <LoanCalculator
              minAmount={family?.min_loan_amount || 50000}
              maxAmount={5000000}
              interestRate={family?.loan_interest_rate || 2.5}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Repayment Schedule Sheet */}
      <Sheet open={showScheduleSheet} onOpenChange={setShowScheduleSheet}>
        <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Loan Details</SheetTitle>
          </SheetHeader>
          {selectedLoan && (
            <div className="mt-4 space-y-4">
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-bold">{selectedLoan.amount.toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Purpose</span>
                    <span className="text-right max-w-[60%]">{selectedLoan.purpose}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge>{selectedLoan.status}</Badge>
                  </div>
                </CardContent>
              </Card>

              {selectedLoan.status === "disbursed" && selectedLoan.disbursed_at && (
                <RepaymentSchedule
                  loanAmount={selectedLoan.amount}
                  interestRate={selectedLoan.interest_rate}
                  termMonths={selectedLoan.term_months}
                  startDate={new Date(selectedLoan.disbursed_at)}
                  amountPaid={selectedLoan.amount_paid || 0}
                  interestPaid={selectedLoan.interest_paid || 0}
                />
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Payment Sheet */}
      <Sheet open={showPaymentSheet} onOpenChange={setShowPaymentSheet}>
        <SheetContent side="bottom" className="h-[60vh]">
          <SheetHeader>
            <SheetTitle>Make Payment</SheetTitle>
          </SheetHeader>
          {selectedLoan && (
            <div className="mt-4">
              <Card className="mb-4">
                <CardContent className="p-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">Loan Amount</span>
                    <span className="font-bold">{selectedLoan.amount.toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Outstanding</span>
                    <span className="font-bold text-orange-600">
                      {(
                        selectedLoan.amount +
                        (selectedLoan.amount * selectedLoan.interest_rate * selectedLoan.term_months) / 100 -
                        (selectedLoan.amount_paid || 0) -
                        (selectedLoan.interest_paid || 0)
                      ).toLocaleString()}{" "}
                      FCFA
                    </span>
                  </div>
                </CardContent>
              </Card>
              <p className="text-sm text-muted-foreground text-center">
                Payment recording coming soon. Contact your family treasurer to record payments.
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

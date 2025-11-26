import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface LoanRequest {
  id: string;
  amount: number;
  interest_rate: number;
  term_months: number;
  status: string;
  purpose: string;
  notes: string | null;
  created_at: string;
  family_members: {
    profiles: {
      full_name: string;
    } | null;
  } | null;
}

export default function LoanCommitteeDashboard() {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { family, canManageLoans, isLoading: authLoading } = useFamilyAuth(familySlug);
  const [loans, setLoans] = useState<LoanRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState<LoanRequest | null>(null);
  const [recommendation, setRecommendation] = useState("");

  useEffect(() => {
    if (family?.id) {
      loadLoanRequests();
    }
  }, [family?.id]);

  const loadLoanRequests = async () => {
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
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLoans(data as any || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading loan requests",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecommendApproval = async (loanId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("loans")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: user.id,
          notes: recommendation || null,
        })
        .eq("id", loanId);

      if (error) throw error;

      toast({
        title: "Loan Recommended for Approval",
        description: "The loan has been forwarded to the family head for final approval.",
      });

      setSelectedLoan(null);
      setRecommendation("");
      loadLoanRequests();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleReject = async (loanId: string) => {
    try {
      const { error } = await supabase
        .from("loans")
        .update({
          status: "rejected",
          notes: recommendation || "Rejected by loan committee",
        })
        .eq("id", loanId);

      if (error) throw error;

      toast({
        title: "Loan Rejected",
        description: "The loan request has been rejected.",
      });

      setSelectedLoan(null);
      setRecommendation("");
      loadLoanRequests();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const calculateTotalRepayment = (loan: LoanRequest) => {
    const interest = (loan.amount * loan.interest_rate * loan.term_months) / 100;
    return loan.amount + interest;
  };

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!canManageLoans) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
            <p className="text-muted-foreground mb-6">
              Only loan committee members can access this dashboard.
            </p>
            <Button onClick={() => navigate(`/family/${familySlug}`)}>
              Back to Dashboard
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/family/${familySlug}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Loan Committee Dashboard</h1>
              <p className="text-muted-foreground">Review and evaluate loan requests</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loans.length}</div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>
        </div>

        {loans.length === 0 ? (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pending loan requests at this time.</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {loans.map((loan) => (
              <Card key={loan.id} className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg">
                        {loan.family_members?.profiles?.full_name || "Unknown Member"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Requested: {format(new Date(loan.created_at), "PPP")}
                      </p>
                    </div>
                    <Badge variant="outline">Pending</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Loan Amount</p>
                      <p className="text-lg font-bold">{loan.amount.toLocaleString()} FCFA</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Repayment</p>
                      <p className="text-lg font-bold">{calculateTotalRepayment(loan).toLocaleString()} FCFA</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Interest Rate</p>
                      <p className="font-medium">{loan.interest_rate}% per month</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Term</p>
                      <p className="font-medium">{loan.term_months} months</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Purpose:</p>
                    <p className="text-sm text-muted-foreground p-3 bg-muted rounded">
                      {loan.purpose}
                    </p>
                  </div>

                  {loan.notes && (
                    <div>
                      <p className="text-sm font-medium mb-2">Additional Notes:</p>
                      <p className="text-sm text-muted-foreground p-3 bg-muted rounded">
                        {loan.notes}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          onClick={() => setSelectedLoan(loan)}
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Recommend Approval
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Recommend Loan for Approval</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="p-4 bg-muted rounded">
                            <p className="text-sm">
                              <strong>Member:</strong> {loan.family_members?.profiles?.full_name}
                            </p>
                            <p className="text-sm">
                              <strong>Amount:</strong> {loan.amount.toLocaleString()} FCFA
                            </p>
                            <p className="text-sm">
                              <strong>Purpose:</strong> {loan.purpose}
                            </p>
                          </div>
                          <div>
                            <Label>Committee Recommendation (Optional)</Label>
                            <Textarea
                              value={recommendation}
                              onChange={(e) => setRecommendation(e.target.value)}
                              placeholder="Add your committee's recommendation or assessment notes..."
                              className="mt-2"
                              rows={4}
                            />
                          </div>
                          <Button
                            onClick={() => handleRecommendApproval(loan.id)}
                            className="w-full"
                          >
                            Submit Recommendation
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="destructive"
                          onClick={() => setSelectedLoan(loan)}
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Reject Loan Request</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="p-4 bg-muted rounded">
                            <p className="text-sm">
                              <strong>Member:</strong> {loan.family_members?.profiles?.full_name}
                            </p>
                            <p className="text-sm">
                              <strong>Amount:</strong> {loan.amount.toLocaleString()} FCFA
                            </p>
                          </div>
                          <div>
                            <Label>Reason for Rejection</Label>
                            <Textarea
                              value={recommendation}
                              onChange={(e) => setRecommendation(e.target.value)}
                              placeholder="Explain why this loan request is being rejected..."
                              className="mt-2"
                              rows={4}
                              required
                            />
                          </div>
                          <Button
                            variant="destructive"
                            onClick={() => handleReject(loan.id)}
                            className="w-full"
                            disabled={!recommendation}
                          >
                            Confirm Rejection
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

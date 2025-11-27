import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Progress } from "@/components/ui/progress";

interface Loan {
  id: string;
  amount: number;
  interest_rate: number;
  term_months: number;
  status: string;
  amount_paid: number | null;
  interest_paid: number | null;
  created_at: string;
  disbursed_at: string | null;
  due_date: string | null;
}

export default function LoanAnalytics() {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { family, canManageLoans, isLoading: authLoading } = useFamilyAuth(familySlug);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (family?.id) {
      loadLoans();
    }
  }, [family?.id]);

  const loadLoans = async () => {
    if (!family) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("loans")
        .select("*")
        .eq("family_id", family.id);

      if (error) throw error;
      setLoans(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const deadline = new Date(currentYear, 10, 30); // November 30

    const totalLoans = loans.length;
    const pendingLoans = loans.filter(l => l.status === 'pending').length;
    const approvedLoans = loans.filter(l => l.status === 'approved').length;
    const disbursedLoans = loans.filter(l => l.status === 'disbursed');
    const repaidLoans = loans.filter(l => l.status === 'repaid').length;

    const totalDisbursed = disbursedLoans.reduce((sum, l) => sum + l.amount, 0) + 
                          loans.filter(l => l.status === 'repaid').reduce((sum, l) => sum + l.amount, 0);
    
    const totalExpectedInterest = [...disbursedLoans, ...loans.filter(l => l.status === 'repaid')]
      .reduce((sum, l) => sum + (l.amount * l.interest_rate * l.term_months) / 100, 0);

    const totalInterestCollected = [...disbursedLoans, ...loans.filter(l => l.status === 'repaid')]
      .reduce((sum, l) => sum + (l.interest_paid || 0), 0);

    const totalPrincipalRepaid = [...disbursedLoans, ...loans.filter(l => l.status === 'repaid')]
      .reduce((sum, l) => sum + (l.amount_paid || 0), 0);

    const totalOutstanding = disbursedLoans.reduce((sum, l) => {
      const totalInterest = (l.amount * l.interest_rate * l.term_months) / 100;
      const totalOwed = l.amount + totalInterest;
      const totalPaid = (l.amount_paid || 0) + (l.interest_paid || 0);
      return sum + (totalOwed - totalPaid);
    }, 0);

    // Calculate overdue loans
    const overdueLoans = disbursedLoans.filter(l => {
      if (!l.due_date) return false;
      return new Date(l.due_date) < now;
    });

    const onTimeLoans = disbursedLoans.filter(l => {
      if (!l.due_date) return true;
      return new Date(l.due_date) >= now;
    });

    const repaymentRate = totalDisbursed > 0 
      ? ((totalPrincipalRepaid + totalInterestCollected) / (totalDisbursed + totalExpectedInterest)) * 100 
      : 0;

    const interestCollectionRate = totalExpectedInterest > 0 
      ? (totalInterestCollected / totalExpectedInterest) * 100 
      : 0;

    const defaultRisk = disbursedLoans.length > 0 
      ? (overdueLoans.length / disbursedLoans.length) * 100 
      : 0;

    return {
      totalLoans,
      pendingLoans,
      approvedLoans,
      disbursedCount: disbursedLoans.length,
      repaidLoans,
      totalDisbursed,
      totalExpectedInterest,
      totalInterestCollected,
      totalPrincipalRepaid,
      totalOutstanding,
      overdueLoans: overdueLoans.length,
      onTimeLoans: onTimeLoans.length,
      repaymentRate,
      interestCollectionRate,
      defaultRisk,
      deadline,
    };
  };

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!canManageLoans) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to view loan analytics.</p>
        </div>
      </div>
    );
  }

  const analytics = calculateAnalytics();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/family/${familySlug}/loans`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold">Loan Analytics</h1>
          </div>
          <LanguageSwitcher />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">Total Disbursed</div>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{analytics.totalDisbursed.toLocaleString()} FCFA</div>
            <p className="text-xs text-muted-foreground mt-1">{analytics.disbursedCount} active loans</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">Outstanding</div>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-orange-600">{analytics.totalOutstanding.toLocaleString()} FCFA</div>
            <p className="text-xs text-muted-foreground mt-1">{analytics.disbursedCount - analytics.repaidLoans} unpaid</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">Interest Revenue</div>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-green-600">{analytics.totalInterestCollected.toLocaleString()} FCFA</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.interestCollectionRate.toFixed(1)}% of expected
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">Repayment Rate</div>
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold">{analytics.repaymentRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">{analytics.repaidLoans} fully repaid</p>
          </Card>
        </div>

        {/* Status Overview */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Loan Portfolio Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Processing Pipeline</span>
                <span className="text-xs text-muted-foreground">{analytics.pendingLoans + analytics.approvedLoans} loans</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-yellow-500" />
                    Pending Review
                  </span>
                  <Badge variant="outline">{analytics.pendingLoans}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-blue-500" />
                    Approved
                  </span>
                  <Badge variant="secondary">{analytics.approvedLoans}</Badge>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Active Loans</span>
                <span className="text-xs text-muted-foreground">{analytics.disbursedCount} loans</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    On Time
                  </span>
                  <Badge variant="default">{analytics.onTimeLoans}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                    Overdue
                  </span>
                  <Badge variant="destructive">{analytics.overdueLoans}</Badge>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Completed</span>
                <span className="text-xs text-muted-foreground">{analytics.repaidLoans} loans</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Principal Recovered</span>
                  <span className="font-mono text-xs">{analytics.totalPrincipalRepaid.toLocaleString()} FCFA</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Interest Earned</span>
                  <span className="font-mono text-xs text-green-600">{analytics.totalInterestCollected.toLocaleString()} FCFA</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Interest Collection Performance</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Collected</span>
                  <span className="font-mono">{analytics.totalInterestCollected.toLocaleString()} FCFA</span>
                </div>
                <Progress value={analytics.interestCollectionRate} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{analytics.interestCollectionRate.toFixed(1)}% of expected</span>
                  <span>Target: {analytics.totalExpectedInterest.toLocaleString()} FCFA</span>
                </div>
              </div>
              <div className="pt-4 border-t">
                <div className="text-sm text-muted-foreground mb-1">Uncollected Interest</div>
                <div className="text-xl font-bold text-orange-600">
                  {(analytics.totalExpectedInterest - analytics.totalInterestCollected).toLocaleString()} FCFA
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Default Risk Assessment</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Risk Level</span>
                  <Badge variant={analytics.defaultRisk > 30 ? "destructive" : analytics.defaultRisk > 15 ? "default" : "secondary"}>
                    {analytics.defaultRisk > 30 ? "High" : analytics.defaultRisk > 15 ? "Medium" : "Low"}
                  </Badge>
                </div>
                <Progress 
                  value={Math.min(analytics.defaultRisk, 100)} 
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{analytics.defaultRisk.toFixed(1)}% of active loans overdue</span>
                  <span>{analytics.overdueLoans} / {analytics.disbursedCount}</span>
                </div>
              </div>
              <div className="pt-4 border-t">
                <div className="text-sm text-muted-foreground mb-1">Deadline</div>
                <div className="text-lg font-semibold">
                  November 30, {analytics.deadline.getFullYear()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.ceil((analytics.deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Summary Card */}
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10">
          <h2 className="text-xl font-semibold mb-4">Portfolio Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground mb-1">Total Loans</div>
              <div className="text-2xl font-bold">{analytics.totalLoans}</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Capital Deployed</div>
              <div className="text-xl font-semibold">{analytics.totalDisbursed.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Expected Return</div>
              <div className="text-xl font-semibold text-green-600">
                +{analytics.totalExpectedInterest.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Success Rate</div>
              <div className="text-xl font-semibold">
                {analytics.disbursedCount > 0 
                  ? ((analytics.onTimeLoans / analytics.disbursedCount) * 100).toFixed(0)
                  : 0}%
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

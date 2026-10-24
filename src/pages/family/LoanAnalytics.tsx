import { useDevice } from "@/hooks/useDevice";
import { AnalyticsKpis, AnalyticsSummary, AnalyticsFilters, MobileChart } from "@/components/analytics/MobileAnalytics";
import { PageHeader } from "@/components/layout/PageHeader";
import { useCurrency } from "@/context/CurrencyContext";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const { isMobile } = useDevice();
  const { formatAmount } = useCurrency();
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
      toast({ title: t("famLoanAnalytics.error"), description: error.message, variant: "destructive" });
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
    return <div className="flex items-center justify-center min-h-screen">{t("famLoanAnalytics.loading")}</div>;
  }

  if (!canManageLoans) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">{t("famLoanAnalytics.accessDenied")}</h2>
          <p className="text-muted-foreground">{t("famLoanAnalytics.youDonTHavePermission")}</p>
        </div>
      </div>
    );
  }

  const analytics = calculateAnalytics();

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {isMobile ? <PageHeader title={t("famLoanAnalytics.loanAnalytics")} backTo={`/family/${familySlug}`} /> : (<div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/family/${familySlug}/loans`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold">{t("famLoanAnalytics.loanAnalytics")}</h1>
          </div>
          <LanguageSwitcher />
        </div>)}

        {/* Key Metrics */}
        <AnalyticsKpis className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">{t("famLoanAnalytics.totalDisbursed")}</div>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{formatAmount(analytics.totalDisbursed)}</div>
            <p className="text-xs text-muted-foreground mt-1">{analytics.disbursedCount} active loans</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">{t("famLoanAnalytics.outstanding")}</div>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-orange-600">{formatAmount(analytics.totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground mt-1">{analytics.disbursedCount - analytics.repaidLoans} unpaid</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">{t("famLoanAnalytics.interestRevenue")}</div>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-green-600">{formatAmount(analytics.totalInterestCollected)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.interestCollectionRate.toFixed(1)}% of expected
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">{t("famLoanAnalytics.repaymentRate")}</div>
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold">{analytics.repaymentRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">{analytics.repaidLoans} fully repaid</p>
          </Card>
        </AnalyticsKpis>

        {/* Status Overview */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">{t("famLoanAnalytics.loanPortfolioStatus")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{t("famLoanAnalytics.processingPipeline")}</span>
                <span className="text-xs text-muted-foreground">{analytics.pendingLoans + analytics.approvedLoans} loans</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-yellow-500" />
                    {t("famLoanAnalytics.pendingReview")}
                  </span>
                  <Badge variant="outline">{analytics.pendingLoans}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-blue-500" />
                    {t("famLoanAnalytics.approved")}
                  </span>
                  <Badge variant="secondary">{analytics.approvedLoans}</Badge>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{t("famLoanAnalytics.activeLoans")}</span>
                <span className="text-xs text-muted-foreground">{analytics.disbursedCount} loans</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    {t("famLoanAnalytics.onTime")}
                  </span>
                  <Badge variant="default">{analytics.onTimeLoans}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                    {t("famLoanAnalytics.overdue")}
                  </span>
                  <Badge variant="destructive">{analytics.overdueLoans}</Badge>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{t("famLoanAnalytics.completed")}</span>
                <span className="text-xs text-muted-foreground">{analytics.repaidLoans} loans</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{t("famLoanAnalytics.principalRecovered")}</span>
                  <span className="font-mono text-xs">{formatAmount(analytics.totalPrincipalRepaid)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>{t("famLoanAnalytics.interestEarned")}</span>
                  <span className="font-mono text-xs text-green-600">{formatAmount(analytics.totalInterestCollected)}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">{t("famLoanAnalytics.interestCollectionPerformance")}</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>{t("famLoanAnalytics.collected")}</span>
                  <span className="font-mono">{formatAmount(analytics.totalInterestCollected)}</span>
                </div>
                <Progress value={analytics.interestCollectionRate} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{analytics.interestCollectionRate.toFixed(1)}% of expected</span>
                  <span>Target: {formatAmount(analytics.totalExpectedInterest)}</span>
                </div>
              </div>
              <div className="pt-4 border-t">
                <div className="text-sm text-muted-foreground mb-1">{t("famLoanAnalytics.uncollectedInterest")}</div>
                <div className="text-xl font-bold text-orange-600">
                  {formatAmount((analytics.totalExpectedInterest - analytics.totalInterestCollected))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">{t("famLoanAnalytics.defaultRiskAssessment")}</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>{t("famLoanAnalytics.riskLevel")}</span>
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
                <div className="text-sm text-muted-foreground mb-1">{t("famLoanAnalytics.deadline")}</div>
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
          <h2 className="text-xl font-semibold mb-4">{t("famLoanAnalytics.portfolioSummary")}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground mb-1">{t("famLoanAnalytics.totalLoans")}</div>
              <div className="text-2xl font-bold">{analytics.totalLoans}</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">{t("famLoanAnalytics.capitalDeployed")}</div>
              <div className="text-xl font-semibold">{analytics.totalDisbursed.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">{t("famLoanAnalytics.expectedReturn")}</div>
              <div className="text-xl font-semibold text-green-600">
                +{analytics.totalExpectedInterest.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">{t("famLoanAnalytics.successRate")}</div>
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

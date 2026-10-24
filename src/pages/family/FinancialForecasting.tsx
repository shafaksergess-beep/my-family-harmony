import { DataCards } from "@/components/layout/DataCards";
import { useDevice } from "@/hooks/useDevice";
import { AnalyticsKpis, AnalyticsSummary, AnalyticsFilters, MobileChart } from "@/components/analytics/MobileAnalytics";
import { PageHeader } from "@/components/layout/PageHeader";
import { useCurrency } from "@/context/CurrencyContext";
import { useTranslation } from "react-i18next";
import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Loader2 } from "lucide-react";

interface ForecastData {
  monthlyProjections: any[];
  expectedIncome: number;
  expectedExpenses: number;
  projectedBalance: number;
  loanRepaymentsForecast: any[];
  contributionTrends: any[];
}

export default function FinancialForecasting() {
  const { t } = useTranslation();
  const { isMobile } = useDevice();
  const { formatAmount } = useCurrency();
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState<ForecastData | null>(null);

  const loadForecastData = useCallback(async () => {
    try {
      setLoading(true);

      // Get family
      const { data: family } = await supabase
        .from("families")
        .select("*")
        .eq("slug", familySlug)
        .single();

      if (!family) return;

      // Get historical data for the last 12 months
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      // Fetch contributions
      const { data: contributions } = await supabase
        .from("contributions")
        .select("amount, contribution_date, status")
        .eq("family_id", family.id)
        .gte("contribution_date", twelveMonthsAgo.toISOString());

      // Fetch loans
      const { data: loans } = await supabase
        .from("loans")
        .select("amount, interest_rate, disbursed_at, due_date, amount_paid, status")
        .eq("family_id", family.id)
        .in("status", ["approved", "disbursed"]);

      // Fetch assistance events
      const { data: assistance } = await supabase
        .from("assistance_events")
        .select("amount, event_date")
        .eq("family_id", family.id)
        .gte("event_date", twelveMonthsAgo.toISOString());

      // Calculate historical monthly averages
      const contributionsByMonth = contributions?.reduce((acc: any, c: any) => {
        if (c.status === "paid") {
          const month = new Date(c.contribution_date).toLocaleDateString("en-US", { year: "numeric", month: "short" });
          acc[month] = (acc[month] || 0) + Number(c.amount);
        }
        return acc;
      }, {});

      const monthlyValues = Object.values(contributionsByMonth || {}) as number[];
      const avgMonthlyContributions = monthlyValues.length > 0
        ? monthlyValues.reduce((sum: number, val: number) => sum + val, 0) / monthlyValues.length
        : 0;

      const avgMonthlyAssistance = assistance
        ? assistance.reduce((sum, a) => sum + Number(a.amount), 0) / 12
        : 0;

      // Project next 6 months
      const projections = [];
      for (let i = 1; i <= 6; i++) {
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + i);
        const monthName = futureDate.toLocaleDateString("en-US", { year: "numeric", month: "short" });

        projections.push({
          month: monthName,
          expectedIncome: avgMonthlyContributions,
          expectedExpenses: avgMonthlyAssistance,
          projectedBalance: avgMonthlyContributions - avgMonthlyAssistance,
        });
      }

      // Calculate loan repayment forecast
      const loanForecast = loans?.map((loan: any) => {
        const totalOwed = Number(loan.amount) * (1 + Number(loan.interest_rate) / 100);
        const remaining = totalOwed - Number(loan.amount_paid || 0);
        return {
          dueDate: loan.due_date,
          expectedAmount: remaining,
        };
      }) || [];

      // Calculate totals
      const totalExpectedIncome = projections.reduce((sum, p) => sum + p.expectedIncome, 0);
      const totalExpectedExpenses = projections.reduce((sum, p) => sum + p.expectedExpenses, 0);

      setForecast({
        monthlyProjections: projections,
        expectedIncome: totalExpectedIncome,
        expectedExpenses: totalExpectedExpenses,
        projectedBalance: totalExpectedIncome - totalExpectedExpenses,
        loanRepaymentsForecast: loanForecast,
        contributionTrends: Object.entries(contributionsByMonth || {}).map(([month, amount]) => ({ month, amount })),
      });
    } catch (error) {
      console.error("Error loading forecast:", error);
    } finally {
      setLoading(false);
    }
  }, [familySlug]);

  useEffect(() => {
    loadForecastData();
  }, [loadForecastData]);

  const formatCurrency = formatAmount;

  const [generatingInsight, setGeneratingInsight] = useState(false);
  const [aiInsight, setAiInsight] = useState<{ summary: string; risks: string; recommendations: string[] } | null>(null);

  const generateAiInsight = async () => {
    if (!forecast || !familySlug) return;
    
    setGeneratingInsight(true);
    try {
      const { data: family } = await supabase
        .from("families")
        .select("name")
        .eq("slug", familySlug)
        .single();

      const { data, error } = await supabase.functions.invoke('financial-insight', {
        body: { 
          familyName: family?.name || "Family",
          financialData: forecast 
        },
      });

      if (error) throw error;
      setAiInsight(data);
    } catch (error) {
      console.error("Error generating AI insight:", error);
    } finally {
      setGeneratingInsight(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {isMobile ? <PageHeader title={t("famFinancialForecasting.financialForecasting")} backTo={`/family/${familySlug}`} actions={[{ key: "insight", label: t("phase2.aiInsight"), icon: TrendingUp, onClick: generateAiInsight, primary: true, disabled: generatingInsight || !forecast }]} /> : (<div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(`/family/${familySlug}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t("famFinancialForecasting.financialForecasting")}</h1>
            <p className="text-muted-foreground">{t("phase2.forecastDescription")}</p>
          </div>
        </div>
        <Button 
          onClick={generateAiInsight} 
          disabled={generatingInsight || !forecast}
          className="gap-2"
        >
          {generatingInsight ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
          AI Financial Insight
        </Button>
      </div>)}

      {/* AI Insight Section */}
      {aiInsight && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {t("famFinancialForecasting.aiFinancialAnalysis")}
            </CardTitle>
            <CardDescription>{t("famFinancialForecasting.intelligentObservationsBasedOnYour")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-1 uppercase tracking-wider text-primary/70">{t("famFinancialForecasting.summary")}</h4>
              <p className="text-sm leading-relaxed">{aiInsight.summary}</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-1 uppercase tracking-wider text-red-600/70">{t("famFinancialForecasting.potentialRisks")}</h4>
              <p className="text-sm leading-relaxed">{aiInsight.risks}</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 uppercase tracking-wider text-green-600/70">{t("famFinancialForecasting.recommendations")}</h4>
              <ul className="list-disc list-inside text-sm space-y-1">
                {aiInsight.recommendations.map((rec, idx) => (
                  <li key={idx} className="leading-relaxed">{rec}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <AnalyticsKpis className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("phase2.expectedIncome")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="min-w-0">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(forecast?.expectedIncome || 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("phase2.expectedExpenses")}</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent className="min-w-0">
            <div className="text-2xl font-bold text-red-600">{formatCurrency(forecast?.expectedExpenses || 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("famFinancialForecasting.projectedNetBalance")}</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="min-w-0">
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(forecast?.projectedBalance || 0)}</div>
          </CardContent>
        </Card>
      </AnalyticsKpis>

      {/* Monthly Projections Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t("phase2.projectionTitle")}</CardTitle>
          <CardDescription>{t("famFinancialForecasting.expectedIncomeAndExpensesBy")}</CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          <MobileChart><ResponsiveContainer width="100%" height={300}>
            <LineChart data={forecast?.monthlyProjections}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Line type="monotone" dataKey="expectedIncome" stroke="hsl(var(--chart-1))" name={t("phase2.expectedIncome")} strokeWidth={2} />
              <Line type="monotone" dataKey="expectedExpenses" stroke="hsl(var(--chart-2))" name={t("phase2.expectedExpenses")} strokeWidth={2} />
              <Line type="monotone" dataKey="projectedBalance" stroke="hsl(var(--chart-3))" name={t("phase2.netBalance")} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer></MobileChart>
        </CardContent>
      </Card>

      {/* Historical Contribution Trends */}
      <Card>
        <CardHeader>
          <CardTitle>{t("famFinancialForecasting.historicalContributionTrends")}</CardTitle>
          <CardDescription>{t("famFinancialForecasting.past12MonthsActualContributions")}</CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          <MobileChart><ResponsiveContainer width="100%" height={250}>
            <BarChart data={forecast?.contributionTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="amount" fill="hsl(var(--chart-1))" name={t("phase2.contribution")} />
            </BarChart>
          </ResponsiveContainer></MobileChart>
        </CardContent>
      </Card>

      {/* Loan Repayments Forecast */}
      {forecast && forecast.loanRepaymentsForecast.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("famFinancialForecasting.upcomingLoanRepayments")}</CardTitle>
            <CardDescription>{t("famFinancialForecasting.expectedLoanRepaymentsByDue")}</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            {isMobile ? <DataCards rows={forecast.loanRepaymentsForecast} getRowKey={row => String(row.dueDate) + String(row.expectedAmount)} title={row => t("famFinancialForecasting.expectedRepayment")} amount={row => row.expectedAmount} columns={[{ key: "0", label: t("phase2.dueDate"), render: row => row.dueDate ? new Date(row.dueDate).toLocaleDateString() : t("phase2.unavailable") }]} /> : (<div className="space-y-3">
              {forecast.loanRepaymentsForecast.map((loan: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{t("phase2.due", { date: new Date(loan.dueDate).toLocaleDateString() })}</p>
                      <p className="text-sm text-muted-foreground">{t("famFinancialForecasting.expectedRepayment")}</p>
                    </div>
                  </div>
                  <div className="text-lg font-bold">{formatCurrency(loan.expectedAmount)}</div>
                </div>
              ))}
            </div>)}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
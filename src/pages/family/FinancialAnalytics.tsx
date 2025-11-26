import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, TrendingUp, DollarSign, PieChart, BarChart3, Download } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface FinancialMetrics {
  totalContributions: number;
  totalLoans: number;
  totalSavings: number;
  totalShares: number;
  loansOutstanding: number;
  monthlyTrend: Array<{ month: string; contributions: number; loans: number; savings: number }>;
  contributionStatus: Array<{ status: string; count: number; fill: string }>;
  loanStatus: Array<{ status: string; amount: number; fill: string }>;
}

const FinancialAnalytics = () => {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [family, setFamily] = useState<any>(null);
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    totalContributions: 0,
    totalLoans: 0,
    totalSavings: 0,
    totalShares: 0,
    loansOutstanding: 0,
    monthlyTrend: [],
    contributionStatus: [],
    loanStatus: [],
  });

  useEffect(() => {
    loadData();
  }, [familySlug]);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Load family
      const { data: familyData } = await supabase
        .from("families")
        .select("*")
        .eq("slug", familySlug)
        .single();

      if (!familyData) {
        navigate("/dashboard");
        return;
      }

      setFamily(familyData);

      // Load contributions
      const { data: contributions } = await supabase
        .from("contributions")
        .select("amount, status, contribution_date")
        .eq("family_id", familyData.id);

      const totalContributions = contributions?.reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0) || 0;

      // Contribution status distribution
      const statusCounts = contributions?.reduce((acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const contributionStatus = Object.entries(statusCounts || {}).map(([status, count], index) => ({
        status,
        count,
        fill: ['#10b981', '#f59e0b', '#ef4444'][index % 3]
      }));

      // Load loans
      const { data: loans } = await supabase
        .from("loans")
        .select("amount, amount_paid, status")
        .eq("family_id", familyData.id);

      const totalLoans = loans?.reduce((sum, l) => sum + parseFloat(l.amount.toString()), 0) || 0;
      const loansOutstanding = loans?.reduce((sum, l) => {
        const amount = parseFloat(l.amount.toString());
        const paid = parseFloat(l.amount_paid?.toString() || '0');
        return sum + (amount - paid);
      }, 0) || 0;

      // Loan status distribution
      const loanStatusData = loans?.reduce((acc, l) => {
        const amount = parseFloat(l.amount.toString());
        const paid = parseFloat(l.amount_paid?.toString() || '0');
        acc[l.status] = (acc[l.status] || 0) + (amount - paid);
        return acc;
      }, {} as Record<string, number>);

      const loanStatus = Object.entries(loanStatusData || {}).map(([status, amount], index) => ({
        status,
        amount,
        fill: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 4]
      }));

      // Load savings
      const { data: savings } = await supabase
        .from("savings")
        .select("amount")
        .eq("family_id", familyData.id);

      const totalSavings = savings?.reduce((sum, s) => sum + parseFloat(s.amount.toString()), 0) || 0;

      // Load shares
      const { data: shares } = await supabase
        .from("shares")
        .select("share_value")
        .eq("family_id", familyData.id)
        .eq("is_active", true);

      const totalShares = shares?.reduce((sum, s) => sum + parseFloat(s.share_value.toString()), 0) || 0;

      // Calculate monthly trend (last 6 months)
      const monthlyData = new Map<string, { contributions: number; loans: number; savings: number }>();
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toISOString().slice(0, 7);
        const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        const monthContributions = contributions?.filter(c => 
          c.contribution_date.startsWith(monthKey)
        ).reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0) || 0;

        const monthLoans = loans?.filter(l => 
          l.status === 'approved' // Assuming approved loans have a date field
        ).reduce((sum, l) => sum + parseFloat(l.amount.toString()), 0) || 0;

        const monthSavings = savings?.reduce((sum, s) => sum + parseFloat(s.amount.toString()), 0) || 0;

        monthlyData.set(monthLabel, {
          contributions: monthContributions,
          loans: monthLoans,
          savings: monthSavings / 6 // Distribute evenly for now
        });
      }

      const monthlyTrend = Array.from(monthlyData.entries()).map(([month, data]) => ({
        month,
        ...data
      }));

      setMetrics({
        totalContributions,
        totalLoans,
        totalSavings,
        totalShares,
        loansOutstanding,
        monthlyTrend,
        contributionStatus,
        loanStatus,
      });
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load financial analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
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
                {t("common.back")}
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="w-6 h-6" />
                  Financial Analytics
                </h1>
                <p className="text-sm text-muted-foreground">{family?.name}</p>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contributions</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(metrics.totalContributions)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Loans</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(metrics.totalLoans)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loans Outstanding</CardTitle>
              <DollarSign className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(metrics.loansOutstanding)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(metrics.totalSavings)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Shares</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(metrics.totalShares)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Monthly Financial Trend
              </CardTitle>
              <CardDescription>Last 6 months overview</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  contributions: { label: "Contributions", color: "hsl(var(--primary))" },
                  loans: { label: "Loans", color: "#3b82f6" },
                  savings: { label: "Savings", color: "#10b981" },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line type="monotone" dataKey="contributions" stroke="hsl(var(--primary))" strokeWidth={2} />
                    <Line type="monotone" dataKey="loans" stroke="#3b82f6" strokeWidth={2} />
                    <Line type="monotone" dataKey="savings" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Contribution Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Contribution Status
              </CardTitle>
              <CardDescription>Distribution by status</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={metrics.contributionStatus.reduce((acc, item) => ({
                  ...acc,
                  [item.status]: { label: item.status, color: item.fill },
                }), {})}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={metrics.contributionStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      dataKey="count"
                    >
                      {metrics.contributionStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </RechartsPie>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Loan Status */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Loan Status Distribution
              </CardTitle>
              <CardDescription>Outstanding amounts by status</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={metrics.loanStatus.reduce((acc, item) => ({
                  ...acc,
                  [item.status]: { label: item.status, color: item.fill },
                }), {})}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.loanStatus}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="status" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="amount">
                      {metrics.loanStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default FinancialAnalytics;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, DollarSign, Wallet, CreditCard, PiggyBank } from "lucide-react";

interface FinancialSummary {
  totalContributions: number;
  totalLoans: number;
  totalSavings: number;
  outstandingLoans: number;
  recentTransactionsCount: number;
  monthlyChange: number;
}

interface FinancialWidgetProps {
  familyId: string;
  className?: string;
}

const FinancialWidget = ({ familyId, className = "" }: FinancialWidgetProps) => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);

  useEffect(() => {
    loadFinancialSummary();
  }, [familyId]);

  const loadFinancialSummary = async () => {
    try {
      setLoading(true);

      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      // Get total contributions (paid)
      const { data: contributions } = await supabase
        .from("contributions")
        .select("amount")
        .eq("family_id", familyId)
        .eq("status", "paid");

      const totalContributions = contributions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

      // Get outstanding loans
      const { data: loans } = await supabase
        .from("loans")
        .select("amount, amount_paid")
        .eq("family_id", familyId)
        .in("status", ["approved", "disbursed"]);

      const totalLoans = loans?.reduce((sum, l) => sum + Number(l.amount), 0) || 0;
      const outstandingLoans = loans?.reduce(
        (sum, l) => sum + (Number(l.amount) - Number(l.amount_paid || 0)),
        0
      ) || 0;

      // Get total savings
      const { data: savings } = await supabase
        .from("savings")
        .select("amount")
        .eq("family_id", familyId);

      const totalSavings = savings?.reduce((sum, s) => sum + Number(s.amount), 0) || 0;

      // Get recent transactions (this month)
      const { data: transactions } = await supabase
        .from("transactions")
        .select("id")
        .eq("family_id", familyId)
        .gte("transaction_date", firstDayOfMonth.toISOString())
        .lte("transaction_date", lastDayOfMonth.toISOString());

      const recentTransactionsCount = transactions?.length || 0;

      // Calculate monthly change (compare this month's contributions to last month)
      const lastMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const lastMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

      const { data: thisMonthContributions } = await supabase
        .from("contributions")
        .select("amount")
        .eq("family_id", familyId)
        .eq("status", "paid")
        .gte("contribution_date", firstDayOfMonth.toISOString())
        .lte("contribution_date", lastDayOfMonth.toISOString());

      const { data: lastMonthContributions } = await supabase
        .from("contributions")
        .select("amount")
        .eq("family_id", familyId)
        .eq("status", "paid")
        .gte("contribution_date", lastMonthStart.toISOString())
        .lte("contribution_date", lastMonthEnd.toISOString());

      const thisMonthTotal = thisMonthContributions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
      const lastMonthTotal = lastMonthContributions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
      
      const monthlyChange = lastMonthTotal > 0
        ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
        : 0;

      setSummary({
        totalContributions,
        totalLoans,
        totalSavings,
        outstandingLoans,
        recentTransactionsCount,
        monthlyChange,
      });
    } catch (error) {
      console.error("Error loading financial summary:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "XAF",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (!summary) return null;

  const metrics = [
    {
      label: "Total Contributions",
      value: summary.totalContributions,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950/20",
    },
    {
      label: "Total Savings",
      value: summary.totalSavings,
      icon: PiggyBank,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
    },
    {
      label: "Outstanding Loans",
      value: summary.outstandingLoans,
      icon: CreditCard,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950/20",
    },
    {
      label: "Total Loans",
      value: summary.totalLoans,
      icon: Wallet,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
    },
  ];

  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Financial Overview</h3>
          <div className="flex items-center gap-2">
            {summary.monthlyChange >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
            <span className={`text-sm font-medium ${summary.monthlyChange >= 0 ? "text-green-600" : "text-red-600"}`}>
              {summary.monthlyChange >= 0 ? "+" : ""}{summary.monthlyChange.toFixed(1)}%
            </span>
            <span className="text-xs text-muted-foreground">vs last month</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div
                key={index}
                className={`p-4 rounded-lg border ${metric.bgColor}`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{metric.label}</p>
                    <p className="text-2xl font-bold">{formatCurrency(metric.value)}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                    <Icon className={`h-5 w-5 ${metric.color}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {summary.recentTransactionsCount > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Recent Transactions</span>
              <Badge variant="secondary">{summary.recentTransactionsCount} this month</Badge>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default FinancialWidget;

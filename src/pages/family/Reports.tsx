import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { Loader2, ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useCurrency } from "@/context/CurrencyContext";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

interface ReportData {
  contributionsTrend: Array<{ month: string; amount: number }>;
  loansTrend: Array<{ month: string; amount: number; count?: number }>;
  savingsTrend: Array<{ month: string; amount: number }>;
  contributionsByType: Array<{ type: string; amount: number }>;
  loansByStatus: Array<{ status: string; count: number; amount: number }>;
}

const FamilyReports = () => {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { family, isLoading: authLoading } = useFamilyAuth(familySlug);
  const { formatAmount } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData>({
    contributionsTrend: [],
    loansTrend: [],
    savingsTrend: [],
    contributionsByType: [],
    loansByStatus: [],
  });


  const processMonthlyData = useCallback((data: Array<Record<string, unknown>>, dateField: string, amountField: string, includeCount = false) => {
    const monthlyData: { [key: string]: { amount: number; count?: number } } = {};
    
    data.forEach((item) => {
      const dateStr = item[dateField] as Extract<Record<string, unknown>[string], string | number | Date>;
      const date = new Date(dateStr);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { amount: 0 };
        if (includeCount) monthlyData[monthKey].count = 0;
      }
      
      monthlyData[monthKey].amount += (item[amountField] as number) || 0;
      if (includeCount) monthlyData[monthKey].count! += 1;
    });

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, data]) => ({
        month: new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        ...data,
      }));
  }, []);

  const processGroupData = useCallback((data: Array<Record<string, unknown>>, groupField: string, amountField: string) => {
    const grouped: { [key: string]: number } = {};
    
    data.forEach((item) => {
      const key = item[groupField] as string;
      grouped[key] = (grouped[key] || 0) + ((item[amountField] as number) || 0);
    });

    return Object.entries(grouped).map(([type, amount]) => ({ type, amount }));
  }, []);

  const loadReportData = useCallback(async () => {
    try {
      // Get contributions data
      const { data: contributions } = await supabase
        .from("contributions")
        .select("amount, contribution_date, type, status")
        .eq("family_id", family.id);

      // Get loans data
      const { data: loans } = await supabase
        .from("loans")
        .select("amount, amount_paid, created_at, status")
        .eq("family_id", family.id);

      // Get savings data
      const { data: savings } = await supabase
        .from("savings")
        .select("amount, month")
        .eq("family_id", family.id);

      // Process contributions trend (last 12 months)
      const contributionsByMonth = processMonthlyData(contributions || [], "contribution_date", "amount");
      
      // Process loans trend
      const loansByMonth = processMonthlyData(loans || [], "created_at", "amount", true);

      // Process savings trend
      const savingsByMonth = processMonthlyData(savings || [], "month", "amount");

      // Process contributions by type
      const contributionsByType = processGroupData(contributions || [], "type", "amount");

      // Process loans by status
      const loansByStatus = (loans || []).reduce((acc: Array<{ status: string; count: number; amount: number }>, loan) => {
        const existing = acc.find((item) => item.status === loan.status);
        if (existing) {
          existing.count += 1;
          existing.amount += loan.amount;
        } else {
          acc.push({ status: loan.status, count: 1, amount: loan.amount });
        }
        return acc;
      }, []);

      setReportData({
        contributionsTrend: contributionsByMonth,
        loansTrend: loansByMonth,
        savingsTrend: savingsByMonth,
        contributionsByType,
        loansByStatus,
      });
    } catch (error) {
      console.error("Error loading report data:", error);
    } finally {
      setLoading(false);
    }
  }, [family, processMonthlyData, processGroupData]);

  useEffect(() => {
    if (family) {
      loadReportData();
    }
  }, [family, loadReportData]);


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
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(`/family/${familySlug}`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Financial Reports</h1>
              <p className="text-sm text-muted-foreground">Analysis and trends</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Contributions Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Contributions Trend (Last 12 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.contributionsTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatAmount(value)} />
                <Legend />
                <Line type="monotone" dataKey="amount" stroke="#8884d8" name="Amount" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Contributions by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Contributions by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={reportData.contributionsByType}
                  dataKey="amount"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.type}: ${formatAmount(entry.amount)}`}
                >
                  {reportData.contributionsByType.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatAmount(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Loans Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-primary" />
              Loans Trend (Last 12 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.loansTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip formatter={(value: number, name: string) => name === "amount" ? formatAmount(value) : value} />
                <Legend />
                <Bar yAxisId="left" dataKey="amount" fill="#8884d8" name="Amount" />
                <Bar yAxisId="right" dataKey="count" fill="#82ca9d" name="Number of Loans" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Loans by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Loans by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.loansByStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip formatter={(value: number, name: string) => name === "amount" ? formatAmount(value) : value} />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" name="Count" />
                <Bar dataKey="amount" fill="#82ca9d" name="Amount" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Savings Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Individual Savings Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.savingsTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatAmount(value)} />
                <Legend />
                <Line type="monotone" dataKey="amount" stroke="#82ca9d" name="Savings Amount" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default FamilyReports;

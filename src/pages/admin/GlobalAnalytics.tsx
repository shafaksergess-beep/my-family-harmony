import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Users,
  DollarSign,
  CreditCard,
  PiggyBank,
  TrendingUp,
  Building2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface FamilyStats {
  id: string;
  name: string;
  totalContributions: number;
  totalLoans: number;
  totalSavings: number;
  memberCount: number;
}

const GlobalAnalytics = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [familyStats, setFamilyStats] = useState<FamilyStats[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalFamilies: 0,
    totalMembers: 0,
    totalContributions: 0,
    totalLoans: 0,
    totalSavings: 0,
    totalShares: 0,
  });

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  const checkAdminAndLoadData = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: adminData } = await supabase
        .from("super_admins")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!adminData) {
        toast({
          title: "Access Denied",
          description: "You must be a super admin to view this page",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setIsSuperAdmin(true);
      await loadGlobalAnalytics();
    } catch (error: any) {
      console.error("Error checking admin status:", error);
      toast({
        title: "Error",
        description: "Failed to load analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadGlobalAnalytics = async () => {
    try {
      // Get all families
      const { data: families, error: familiesError } = await supabase
        .from("families")
        .select("id, name")
        .eq("is_active", true);

      if (familiesError) throw familiesError;

      const stats: FamilyStats[] = [];
      let totals = {
        totalFamilies: families?.length || 0,
        totalMembers: 0,
        totalContributions: 0,
        totalLoans: 0,
        totalSavings: 0,
        totalShares: 0,
      };

      for (const family of families || []) {
        // Get member count
        const { count: memberCount } = await supabase
          .from("family_members")
          .select("*", { count: "exact", head: true })
          .eq("family_id", family.id);

        // Get contributions
        const { data: contributions } = await supabase
          .from("contributions")
          .select("amount")
          .eq("family_id", family.id)
          .eq("status", "paid");

        const totalContributions =
          contributions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

        // Get loans
        const { data: loans } = await supabase
          .from("loans")
          .select("amount")
          .eq("family_id", family.id);

        const totalLoans =
          loans?.reduce((sum, l) => sum + Number(l.amount), 0) || 0;

        // Get savings
        const { data: savings } = await supabase
          .from("savings")
          .select("amount")
          .eq("family_id", family.id);

        const totalSavings =
          savings?.reduce((sum, s) => sum + Number(s.amount), 0) || 0;

        // Get shares
        const { data: shares } = await supabase
          .from("shares")
          .select("share_value")
          .eq("family_id", family.id)
          .eq("is_active", true);

        const totalShares =
          shares?.reduce((sum, s) => sum + Number(s.share_value), 0) || 0;

        stats.push({
          id: family.id,
          name: family.name,
          totalContributions,
          totalLoans,
          totalSavings,
          memberCount: memberCount || 0,
        });

        totals.totalMembers += memberCount || 0;
        totals.totalContributions += totalContributions;
        totals.totalLoans += totalLoans;
        totals.totalSavings += totalSavings;
        totals.totalShares += totalShares;
      }

      setFamilyStats(stats);
      setTotalStats(totals);
    } catch (error) {
      console.error("Error loading global analytics:", error);
      throw error;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "XAF",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Global Analytics</h1>
            <p className="text-muted-foreground">
              Overview of all families in the system
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Families
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStats.totalFamilies}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Members
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStats.totalMembers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Contributions
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totalStats.totalContributions)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Loans</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totalStats.totalLoans)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Savings
              </CardTitle>
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totalStats.totalSavings)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Shares Value
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totalStats.totalShares)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart - Family Contributions */}
          <Card>
            <CardHeader>
              <CardTitle>Contributions by Family</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={familyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="totalContributions" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pie Chart - Member Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Member Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={familyStats}
                    dataKey="memberCount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {familyStats.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Family Details Table */}
        <Card>
          <CardHeader>
            <CardTitle>Family Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Family Name</th>
                    <th className="text-right p-3 font-medium">Members</th>
                    <th className="text-right p-3 font-medium">
                      Contributions
                    </th>
                    <th className="text-right p-3 font-medium">Loans</th>
                    <th className="text-right p-3 font-medium">Savings</th>
                  </tr>
                </thead>
                <tbody>
                  {familyStats.map((family) => (
                    <tr key={family.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">{family.name}</td>
                      <td className="p-3 text-right">{family.memberCount}</td>
                      <td className="p-3 text-right">
                        {formatCurrency(family.totalContributions)}
                      </td>
                      <td className="p-3 text-right">
                        {formatCurrency(family.totalLoans)}
                      </td>
                      <td className="p-3 text-right">
                        {formatCurrency(family.totalSavings)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GlobalAnalytics;

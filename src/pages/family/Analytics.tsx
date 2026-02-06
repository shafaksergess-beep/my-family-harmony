import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { Loader2, ArrowLeft, TrendingUp, Users, DollarSign, PiggyBank, CreditCard, AlertCircle } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SavingsGrowthChart } from "@/components/analytics/SavingsGrowthChart";
import { LoanRepaymentChart } from "@/components/analytics/LoanRepaymentChart";
import { ContributionTrendsChart } from "@/components/analytics/ContributionTrendsChart";

interface KPIData {
  totalMembers: number;
  activeLoans: number;
  totalLoansAmount: number;
  totalSavings: number;
  totalContributions: number;
  cashAtHand: number;
  pendingContributions: number;
  completedMeetings: number;
}

const FamilyAnalytics = () => {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { family, isLoading: authLoading } = useFamilyAuth(familySlug);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIData>({
    totalMembers: 0,
    activeLoans: 0,
    totalLoansAmount: 0,
    totalSavings: 0,
    totalContributions: 0,
    cashAtHand: 0,
    pendingContributions: 0,
    completedMeetings: 0,
  });

  useEffect(() => {
    if (family?.id) {
      loadAnalytics();
    }
  }, [family?.id]);

  const loadAnalytics = async () => {
    if (!family) return;
    
    try {

      // Get member count
      const { count: memberCount } = await supabase
        .from("family_members")
        .select("*", { count: "exact", head: true })
        .eq("family_id", family.id);

      // Get active loans
      const { data: loansData, count: loansCount } = await supabase
        .from("loans")
        .select("amount", { count: "exact" })
        .eq("family_id", family.id)
        .eq("status", "active");

      const totalLoansAmount = loansData?.reduce((sum, loan) => sum + Number(loan.amount), 0) || 0;

      // Get contributions
      const { data: contributionsData } = await supabase
        .from("contributions")
        .select("amount, status")
        .eq("family_id", family.id);

      const totalContributions = contributionsData?.filter(c => c.status === "paid").reduce((sum, c) => sum + Number(c.amount), 0) || 0;
      const pendingContributions = contributionsData?.filter(c => c.status === "pending").length || 0;

      // Get savings
      const { data: savingsData } = await supabase
        .from("contributions")
        .select("amount")
        .eq("family_id", family.id)
        .eq("type", "savings")
        .eq("status", "paid");

      const totalSavings = savingsData?.reduce((sum, s) => sum + Number(s.amount), 0) || 0;

      // Get completed meetings
      const { count: meetingsCount } = await supabase
        .from("meetings")
        .select("*", { count: "exact", head: true })
        .eq("family_id", family.id)
        .eq("is_completed", true);

      // Calculate cash at hand (simplified)
      const cashAtHand = totalContributions - totalLoansAmount;

      setKpis({
        totalMembers: memberCount || 0,
        activeLoans: loansCount || 0,
        totalLoansAmount,
        totalSavings,
        totalContributions,
        cashAtHand,
        pendingContributions,
        completedMeetings: meetingsCount || 0,
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
      toast({
        title: "Error",
        description: "Failed to load analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const kpiCards = [
    {
      title: "Total Members",
      value: kpis.totalMembers,
      icon: Users,
      description: "Active family members",
      color: "text-primary",
    },
    {
      title: "Cash at Hand",
      value: `${kpis.cashAtHand.toLocaleString()} FCFA`,
      icon: DollarSign,
      description: "Available funds",
      color: "text-emerald-600",
    },
    {
      title: "Total Savings",
      value: `${kpis.totalSavings.toLocaleString()} FCFA`,
      icon: PiggyBank,
      description: "Member savings",
      color: "text-blue-600",
    },
    {
      title: "Active Loans",
      value: kpis.activeLoans,
      icon: CreditCard,
      description: `${kpis.totalLoansAmount.toLocaleString()} FCFA outstanding`,
      color: "text-orange-600",
    },
    {
      title: "Total Contributions",
      value: `${kpis.totalContributions.toLocaleString()} FCFA`,
      icon: TrendingUp,
      description: "All-time contributions",
      color: "text-purple-600",
    },
    {
      title: "Pending Payments",
      value: kpis.pendingContributions,
      icon: AlertCircle,
      description: "Outstanding contributions",
      color: "text-red-600",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate(`/family/${familySlug}`)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{family?.name} - Analytics</h1>
                <p className="text-sm text-muted-foreground">Key performance indicators and insights</p>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {kpiCards.map((kpi, index) => (
            <Card key={index} className="hover:shadow-lg transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{kpi.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Visual Analytics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SavingsGrowthChart familyId={family?.id || ''} />
          <LoanRepaymentChart familyId={family?.id || ''} />
        </div>

        <div className="mb-8">
          <ContributionTrendsChart familyId={family?.id || ''} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Meeting Statistics</CardTitle>
            <CardDescription>Overview of family meetings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Completed Meetings:</span>
                <span className="text-2xl font-bold text-primary">{kpis.completedMeetings}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default FamilyAnalytics;

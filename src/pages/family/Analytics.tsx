import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { useCurrency } from "@/context/CurrencyContext";
import { Loader2, ArrowLeft, TrendingUp, Users, DollarSign, PiggyBank, CreditCard, AlertCircle } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SavingsGrowthChart } from "@/components/analytics/SavingsGrowthChart";
import { LoanRepaymentChart } from "@/components/analytics/LoanRepaymentChart";
import { ContributionTrendsChart } from "@/components/analytics/ContributionTrendsChart";
import { Sparkles, Activity, ShieldCheck, Target } from "lucide-react";
import SEO from "@/components/SEO";

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

interface MemberOption {
  id: string;
  memberId: string;
  name: string;
}

const FamilyAnalytics = () => {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { family, canManageFinances, memberId, isLoading: authLoading } = useFamilyAuth(familySlug);
  const { formatAmount } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"family" | "member">("family");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [memberOptions, setMemberOptions] = useState<MemberOption[]>([]);
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

  const [healthScore, setHealthScore] = useState<{
    score: number;
    status: string;
    analysis: string;
    improvements: string[];
  } | null>(null);
  const [fetchingHealth, setFetchingHealth] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!family) return;
    const { data: members } = await supabase
      .from("family_members")
      .select("id, user_id")
      .eq("family_id", family.id);
    if (!members) return;
    const userIds = members.map((m) => m.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    const userToName = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);
    setMemberOptions(
      members.map((m) => ({ id: m.user_id, memberId: m.id, name: userToName.get(m.user_id) || "Unknown" }))
    );
  }, [family]);

  const loadHealthScore = useCallback(async () => {
    if (!family?.id) return;
    setFetchingHealth(true);
    try {
      const { data, error } = await supabase.functions.invoke("family-health-score", {
        body: { familyId: family.id },
      });
      if (error) throw error;
      setHealthScore(data);
    } catch (error) {
      console.error("Error loading health score:", error);
    } finally {
      setFetchingHealth(false);
    }
  }, [family?.id]);

  const loadAnalytics = useCallback(async () => {
    if (!family) return;

    try {
      const filterMemberId = viewMode === "member" ? (selectedMemberId || memberId) : null;

      // Get member count
      const { count: memberCount } = await supabase
        .from("family_members")
        .select("*", { count: "exact", head: true })
        .eq("family_id", family.id);

      // Get active loans
      let loansQuery = supabase
        .from("loans")
        .select("amount", { count: "exact" })
        .eq("family_id", family.id)
        .eq("status", "active");
      if (filterMemberId) {
        // Find the family_member id for this user
        const memberOpt = memberOptions.find((m) => m.id === filterMemberId || m.memberId === filterMemberId);
        if (memberOpt) loansQuery = loansQuery.eq("member_id", memberOpt.memberId);
      }
      const { data: loansData, count: loansCount } = await loansQuery;
      const totalLoansAmount = loansData?.reduce((sum, loan) => sum + Number(loan.amount), 0) || 0;

      // Get contributions
      let contribQuery = supabase.from("contributions").select("amount, status").eq("family_id", family.id);
      if (filterMemberId) {
        const memberOpt = memberOptions.find((m) => m.id === filterMemberId || m.memberId === filterMemberId);
        if (memberOpt) contribQuery = contribQuery.eq("member_id", memberOpt.memberId);
      }
      const { data: contributionsData } = await contribQuery;
      const totalContributions = contributionsData?.filter((c) => c.status === "paid").reduce((sum, c) => sum + Number(c.amount), 0) || 0;
      const pendingContributions = contributionsData?.filter((c) => c.status === "pending").length || 0;

      // Get savings
      let savingsQuery = supabase.from("savings").select("amount").eq("family_id", family.id).eq("status", "approved");
      if (filterMemberId) {
        const memberOpt = memberOptions.find((m) => m.id === filterMemberId || m.memberId === filterMemberId);
        if (memberOpt) savingsQuery = savingsQuery.eq("member_id", memberOpt.memberId);
      }
      const { data: savingsData } = await savingsQuery;
      const totalSavings = savingsData?.reduce((sum, s) => sum + Number(s.amount), 0) || 0;

      // Get completed meetings
      const { count: meetingsCount } = await supabase
        .from("meetings")
        .select("*", { count: "exact", head: true })
        .eq("family_id", family.id)
        .eq("is_completed", true);

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
      toast({ title: "Error", description: "Failed to load analytics", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [family, toast, viewMode, selectedMemberId, memberId, memberOptions]);

  useEffect(() => {
    if (family?.id) {
      loadMembers();
      loadHealthScore();
    }
  }, [family?.id, loadMembers, loadHealthScore]);

  useEffect(() => {
    if (family?.id && memberOptions.length > 0) {
      loadAnalytics();
    }
  }, [family?.id, loadAnalytics, memberOptions]);

  // When switching to "my stats", pre-select current user's member id
  useEffect(() => {
    if (viewMode === "member" && !selectedMemberId && memberId) {
      setSelectedMemberId(memberId);
    }
  }, [viewMode, selectedMemberId, memberId]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentMemberName = memberOptions.find((m) => m.memberId === selectedMemberId)?.name || "My";

  const kpiCards = [
    { title: viewMode === "member" ? `${currentMemberName}'s Contributions` : "Total Contributions", value: formatAmount(kpis.totalContributions), icon: TrendingUp, description: viewMode === "member" ? "Member contributions" : "All-time contributions", color: "text-purple-600" },
    { title: "Cash at Hand", value: formatAmount(kpis.cashAtHand), icon: DollarSign, description: "Available funds", color: "text-emerald-600" },
    { title: viewMode === "member" ? `${currentMemberName}'s Savings` : "Total Savings", value: formatAmount(kpis.totalSavings), icon: PiggyBank, description: "Savings total", color: "text-blue-600" },
    { title: "Active Loans", value: String(kpis.activeLoans), icon: CreditCard, description: `${formatAmount(kpis.totalLoansAmount)} outstanding`, color: "text-orange-600" },
    ...(viewMode === "family" ? [
      { title: "Total Members", value: String(kpis.totalMembers), icon: Users, description: "Active family members", color: "text-primary" },
      { title: "Pending Payments", value: String(kpis.pendingContributions), icon: AlertCircle, description: "Outstanding contributions", color: "text-red-600" },
    ] : []),
  ];

  const glassCardStyle = "bg-white/40 dark:bg-black/20 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-2xl hover:bg-white/50 dark:hover:bg-black/30 transition-all duration-300";

  return (
    <>
      <SEO title="Family Analytics" description="Insights and KPIs across contributions, savings, loans and meetings." />
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/50 to-background">
      <header className="sticky top-0 z-50 border-b border-white/20 bg-white/10 backdrop-blur-md">
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
            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <Select value={viewMode} onValueChange={(v) => { setViewMode(v as "family" | "member"); setLoading(true); }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="family">Family Overview</SelectItem>
                  <SelectItem value="member">My Stats</SelectItem>
                </SelectContent>
              </Select>

              {/* Member Selector - only for leadership when in member view */}
              {viewMode === "member" && canManageFinances && (
                <Select value={selectedMemberId} onValueChange={(v) => { setSelectedMemberId(v); setLoading(true); }}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    {memberOptions.map((m) => (
                      <SelectItem key={m.memberId} value={m.memberId}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* AI Health Score - only in family view */}
        {viewMode === "family" && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className={`${glassCardStyle} border-primary/30 dark:border-primary/20 overflow-hidden relative`}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 z-0"></div>
              <CardHeader className="relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Family Health Score
                    </CardTitle>
                    <CardDescription>AI-driven engagement and financial sustainability metric</CardDescription>
                  </div>
                  {healthScore && (
                    <div className="flex flex-col items-center">
                      <div className={`text-4xl font-extrabold ${healthScore.score > 80 ? "text-emerald-500" : healthScore.score > 50 ? "text-amber-500" : "text-rose-500"}`}>
                        {healthScore.score}
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-widest opacity-70">Points</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="relative z-10 space-y-6">
                {fetchingHealth ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground animate-pulse">Analyzing family dynamics...</p>
                  </div>
                ) : healthScore ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          healthScore.status === "Thriving" ? "bg-emerald-500/20 text-emerald-600" :
                          healthScore.status === "Stable" ? "bg-blue-500/20 text-blue-600" :
                          "bg-amber-500/20 text-amber-600"
                        }`}>
                          {healthScore.status}
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground italic">"{healthScore.analysis}"</p>
                      <div className="flex items-center gap-8 pt-2">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-primary" />
                          <span className="text-xs font-semibold">Participation: {kpis.completedMeetings} Active</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-primary" />
                          <span className="text-xs font-semibold">Safety: 100% Verified</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        Key Recommendations
                      </h4>
                      <ul className="space-y-3">
                        {healthScore.improvements.map((imp, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm p-3 rounded-lg bg-white/20 dark:bg-white/5 border border-white/10">
                            <span className="text-primary font-bold">{i + 1}.</span>
                            <span className="text-muted-foreground">{imp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">No health analysis available.</div>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kpiCards.map((kpi, index) => (
            <Card key={index} className={glassCardStyle}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold tracking-tight">{kpi.title}</CardTitle>
                <div className={`p-2 rounded-xl bg-muted/20 ${kpi.color}`}>
                  <kpi.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black tracking-tighter">{kpi.value}</div>
                <p className="text-[10px] text-muted-foreground mt-1 font-medium uppercase tracking-wider">{kpi.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts - only in family view */}
        {viewMode === "family" && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <SavingsGrowthChart familyId={family?.id || ""} />
              <LoanRepaymentChart familyId={family?.id || ""} />
            </div>
            <div className="mb-8">
              <ContributionTrendsChart familyId={family?.id || ""} />
            </div>
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Meeting Statistics</CardTitle>
            <CardDescription>Overview of family meetings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Completed Meetings:</span>
              <span className="text-2xl font-bold text-primary">{kpis.completedMeetings}</span>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
    </>
  );
};

export default FamilyAnalytics;

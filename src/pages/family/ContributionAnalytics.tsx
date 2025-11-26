import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, TrendingUp, AlertTriangle, Clock, DollarSign, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { calculateCreditScore, getCreditScoreColor, getCreditScoreBadgeVariant } from "@/lib/creditScoring";

interface Contribution {
  id: string;
  amount: number;
  contribution_date: string;
  payment_date: string;
  status: string;
  late_fine: number;
  member_id: string;
  family_members: {
    profiles: { full_name: string };
    joined_at: string;
  };
}

interface MemberSummary {
  member_id: string;
  member_name: string;
  total_paid: number;
  total_outstanding: number;
  late_count: number;
  on_time_count: number;
  credit_score?: number;
  credit_rating?: string;
}

const ContributionAnalytics = () => {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { family, canManageFinances, isLoading } = useFamilyAuth(familySlug);
  const { toast } = useToast();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [memberSummaries, setMemberSummaries] = useState<MemberSummary[]>([]);

  useEffect(() => {
    if (family) {
      loadData();
    }
  }, [family]);

  const loadData = async () => {
    if (!family) return;

    try {
      // Load contributions
      const { data: contributionsData, error: contributionsError } = await supabase
        .from("contributions")
        .select("*")
        .eq("family_id", family.id)
        .order("contribution_date", { ascending: false });

      if (contributionsError) throw contributionsError;

      // Load member info separately
      const memberIds = [...new Set((contributionsData || []).map(c => c.member_id))];
      const { data: membersData } = await supabase
        .from("family_members")
        .select("id, user_id, joined_at")
        .in("id", memberIds);

      const userIds = membersData?.map(m => m.user_id) || [];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const membersMap = new Map(membersData?.map(m => [m.id, { ...m, profiles: profilesMap.get(m.user_id) }]) || []);

      // Load loans for credit scoring
      const { data: loansData } = await supabase
        .from("loans")
        .select("member_id, status, amount, amount_paid, due_date")
        .eq("family_id", family.id);
      
      const enrichedContributions = (contributionsData || []).map(contribution => ({
        ...contribution,
        family_members: membersMap.get(contribution.member_id) || { profiles: { full_name: "Unknown" }, joined_at: new Date().toISOString() }
      }));

      setContributions(enrichedContributions as any);

      // Calculate monthly data
      const monthlyMap = new Map<string, { month: string; paid: number; outstanding: number }>();
      enrichedContributions.forEach(contribution => {
        const month = new Date(contribution.contribution_date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
        });
        
        if (!monthlyMap.has(month)) {
          monthlyMap.set(month, { month, paid: 0, outstanding: 0 });
        }
        
        const data = monthlyMap.get(month)!;
        if (contribution.status === "paid") {
          data.paid += contribution.amount;
        } else {
          data.outstanding += contribution.amount;
        }
      });

      const monthlyArray = Array.from(monthlyMap.values()).slice(0, 12).reverse();
      setMonthlyData(monthlyArray);

      // Calculate member summaries with credit scores
      const memberMap = new Map<string, MemberSummary>();
      enrichedContributions.forEach(contribution => {
        const memberData = membersMap.get(contribution.member_id);
        const memberName = (memberData?.profiles as any)?.full_name || "Unknown";
        
        if (!memberMap.has(contribution.member_id)) {
          memberMap.set(contribution.member_id, {
            member_id: contribution.member_id,
            member_name: memberName,
            total_paid: 0,
            total_outstanding: 0,
            late_count: 0,
            on_time_count: 0,
          });
        }

        const summary = memberMap.get(contribution.member_id)!;
        if (contribution.status === "paid") {
          summary.total_paid += contribution.amount;
          const contributionDate = new Date(contribution.contribution_date);
          const paymentDate = contribution.payment_date ? new Date(contribution.payment_date) : null;
          if (paymentDate && paymentDate > contributionDate) {
            summary.late_count++;
          } else {
            summary.on_time_count++;
          }
        } else {
          summary.total_outstanding += contribution.amount;
        }
      });

      // Calculate credit scores
      memberMap.forEach((summary, memberId) => {
        const memberContributions = enrichedContributions.filter(c => c.member_id === memberId);
        const memberLoans = loansData?.filter(l => l.member_id === memberId) || [];
        const memberData = membersMap.get(memberId);
        
        const joinedAt = memberData?.joined_at;
        const monthsAsMember = joinedAt
          ? Math.floor((new Date().getTime() - new Date(joinedAt).getTime()) / (1000 * 60 * 60 * 24 * 30))
          : 0;

        const totalFines = memberContributions
          .filter(c => c.late_fine > 0)
          .reduce((sum, c) => sum + c.late_fine, 0);

        const creditScoreData = calculateCreditScore({
          totalContributions: summary.on_time_count + summary.late_count,
          paidOnTimeContributions: summary.on_time_count,
          lateContributions: summary.late_count,
          totalLoans: memberLoans.length,
          repaidLoansOnTime: memberLoans.filter(l => l.status === "paid").length,
          defaultedLoans: memberLoans.filter(l => l.status === "defaulted").length,
          totalFines: totalFines,
          monthsAsMember,
          consecutiveMonthsPaid: summary.on_time_count,
        });

        summary.credit_score = creditScoreData.score;
        summary.credit_rating = creditScoreData.rating;
      });

      setMemberSummaries(Array.from(memberMap.values()));
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load contribution analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalPaid = contributions
    .filter(c => c.status === "paid")
    .reduce((sum, c) => sum + c.amount, 0);

  const totalOutstanding = contributions
    .filter(c => c.status !== "paid")
    .reduce((sum, c) => sum + c.amount, 0);

  const latePayments = contributions.filter(c => {
    if (c.status !== "paid") {
      const contributionDate = new Date(c.contribution_date);
      return new Date() > contributionDate;
    }
    return false;
  });

  const totalLateFines = contributions
    .filter(c => c.status === "paid" && c.late_fine > 0)
    .reduce((sum, c) => sum + c.late_fine, 0);

  if (isLoading || loading) {
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
              <h1 className="text-2xl font-bold text-foreground">Contribution Analytics</h1>
              <p className="text-sm text-muted-foreground">Track payment trends and member credit scores</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Collected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <DollarSign className="w-4 h-4 text-green-500 mr-2" />
                <span className="text-2xl font-bold">{totalPaid.toLocaleString()} FCFA</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Clock className="w-4 h-4 text-orange-500 mr-2" />
                <span className="text-2xl font-bold">{totalOutstanding.toLocaleString()} FCFA</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Late Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <AlertTriangle className="w-4 h-4 text-red-500 mr-2" />
                <span className="text-2xl font-bold">{latePayments.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Late Fines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <TrendingUp className="w-4 h-4 text-blue-500 mr-2" />
                <span className="text-2xl font-bold">{totalLateFines.toLocaleString()} FCFA</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="trends" className="space-y-6">
          <TabsList>
            <TabsTrigger value="trends">Payment Trends</TabsTrigger>
            <TabsTrigger value="members">Member Analysis</TabsTrigger>
            <TabsTrigger value="late">Late Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Payment Trends</CardTitle>
                <CardDescription>Track contributions collected vs outstanding over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="paid" stroke="#22c55e" name="Paid" strokeWidth={2} />
                    <Line type="monotone" dataKey="outstanding" stroke="#f97316" name="Outstanding" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle>Member Payment Analysis with Credit Scores</CardTitle>
                <CardDescription>Individual contribution tracking and creditworthiness</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {memberSummaries.map(summary => (
                    <div key={summary.member_id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-medium">{summary.member_name}</p>
                          {summary.credit_score !== undefined && (
                            <div className="flex items-center gap-2">
                              <Badge variant={getCreditScoreBadgeVariant(summary.credit_rating || "")}>
                                {summary.credit_rating}
                              </Badge>
                              <div className="flex items-center gap-1">
                                <Award className={`h-4 w-4 ${getCreditScoreColor(summary.credit_score)}`} />
                                <span className={`font-bold ${getCreditScoreColor(summary.credit_score)}`}>
                                  {summary.credit_score}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                          <span>Paid: {summary.total_paid.toLocaleString()} FCFA</span>
                          {summary.total_outstanding > 0 && (
                            <span className="text-orange-500">Outstanding: {summary.total_outstanding.toLocaleString()} FCFA</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          {summary.on_time_count} on time
                        </Badge>
                        {summary.late_count > 0 && (
                          <Badge variant="outline" className="bg-red-50 text-red-700">
                            {summary.late_count} late
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="late">
            <Card>
              <CardHeader>
                <CardTitle>Late Payments</CardTitle>
                <CardDescription>Overdue contributions requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                {latePayments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No late payments</p>
                ) : (
                  <div className="space-y-4">
                  {latePayments.map(contribution => {
                      const daysLate = Math.ceil(
                        (new Date().getTime() - new Date(contribution.contribution_date).getTime()) / (1000 * 60 * 60 * 24)
                      );
                      const memberName = (contribution.family_members?.profiles as any)?.full_name || "Unknown";
                      
                      return (
                        <div key={contribution.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                          <div>
                            <p className="font-medium">{memberName}</p>
                            <p className="text-sm text-muted-foreground">
                              Due: {new Date(contribution.contribution_date).toLocaleDateString()}
                            </p>
                            <p className="text-sm font-medium text-red-600 mt-1">
                              {daysLate} days overdue
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">{contribution.amount.toLocaleString()} FCFA</p>
                            <Badge variant="destructive">Overdue</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ContributionAnalytics;
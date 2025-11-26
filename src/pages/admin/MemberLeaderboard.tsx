import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Trophy, TrendingUp, Award, Medal, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface LeaderboardEntry {
  memberId: string;
  name: string;
  avatar: string | null;
  role: string;
  score: number;
  value: number;
  rank: number;
}

const MemberLeaderboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [families, setFamilies] = useState<any[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [contributionLeaders, setContributionLeaders] = useState<LeaderboardEntry[]>([]);
  const [attendanceLeaders, setAttendanceLeaders] = useState<LeaderboardEntry[]>([]);
  const [savingsLeaders, setSavingsLeaders] = useState<LeaderboardEntry[]>([]);
  const [overallLeaders, setOverallLeaders] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    loadFamilies();
  }, []);

  useEffect(() => {
    if (selectedFamily) {
      loadLeaderboards();
    }
  }, [selectedFamily]);

  const loadFamilies = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if super admin
      const { data: isSuperAdmin } = await supabase.rpc("is_super_admin", {
        check_user_id: user.id,
      });

      if (!isSuperAdmin) {
        toast({
          title: t("common.error"),
          description: "You don't have permission to access this page",
          variant: "destructive",
        });
        navigate("/admin/dashboard");
        return;
      }

      const { data: familiesData } = await supabase
        .from("families")
        .select("*")
        .eq("is_active", true)
        .order("name");

      setFamilies(familiesData || []);
      if (familiesData && familiesData.length > 0) {
        setSelectedFamily(familiesData[0].id);
      }
    } catch (error) {
      console.error("Error loading families:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboards = async () => {
    if (!selectedFamily) return;

    setLoading(true);
    try {
      // Load all members
      const { data: members } = await supabase
        .from("family_members")
        .select(`
          id,
          role,
          profiles!inner (full_name, avatar_url)
        `)
        .eq("family_id", selectedFamily);

      if (!members) return;

      const leaderboardPromises = members.map(async (member) => {
        // Load contributions
        const { data: contributions } = await supabase
          .from("contributions")
          .select("*")
          .eq("member_id", member.id)
          .eq("status", "paid");

        // Load savings
        const { data: savings } = await supabase
          .from("savings")
          .select("*")
          .eq("member_id", member.id);

        // Load attendance
        const { data: attendance } = await supabase
          .from("attendance")
          .select("*")
          .eq("member_id", member.id);

        const totalContributions = (contributions || []).reduce((sum, c) => sum + Number(c.amount), 0);
        const totalSavings = (savings || []).reduce((sum, s) => sum + Number(s.amount), 0);
        const attendanceRate = (attendance || []).length > 0
          ? ((attendance || []).filter(a => a.status === 'present').length / (attendance || []).length * 100)
          : 0;

        const profiles = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;

        return {
          memberId: member.id,
          name: profiles?.full_name || 'Unknown',
          avatar: profiles?.avatar_url || null,
          role: member.role,
          totalContributions,
          totalSavings,
          attendanceRate,
          attendanceCount: (attendance || []).length,
        };
      });

      const results = await Promise.all(leaderboardPromises);

      // Contribution Leaderboard
      const contributionRanked = results
        .sort((a, b) => b.totalContributions - a.totalContributions)
        .map((r, i) => ({
          memberId: r.memberId,
          name: r.name,
          avatar: r.avatar,
          role: r.role,
          score: r.totalContributions,
          value: r.totalContributions,
          rank: i + 1,
        }));
      setContributionLeaders(contributionRanked.slice(0, 10));

      // Attendance Leaderboard
      const attendanceRanked = results
        .filter(r => r.attendanceCount > 0)
        .sort((a, b) => b.attendanceRate - a.attendanceRate)
        .map((r, i) => ({
          memberId: r.memberId,
          name: r.name,
          avatar: r.avatar,
          role: r.role,
          score: r.attendanceRate,
          value: r.attendanceRate,
          rank: i + 1,
        }));
      setAttendanceLeaders(attendanceRanked.slice(0, 10));

      // Savings Leaderboard
      const savingsRanked = results
        .sort((a, b) => b.totalSavings - a.totalSavings)
        .map((r, i) => ({
          memberId: r.memberId,
          name: r.name,
          avatar: r.avatar,
          role: r.role,
          score: r.totalSavings,
          value: r.totalSavings,
          rank: i + 1,
        }));
      setSavingsLeaders(savingsRanked.slice(0, 10));

      // Overall Leaderboard (weighted score)
      const overallRanked = results
        .map(r => {
          const maxContribution = Math.max(...results.map(x => x.totalContributions));
          const maxSavings = Math.max(...results.map(x => x.totalSavings));
          
          const contributionScore = maxContribution > 0 ? (r.totalContributions / maxContribution) * 40 : 0;
          const savingsScore = maxSavings > 0 ? (r.totalSavings / maxSavings) * 30 : 0;
          const attendanceScore = r.attendanceRate * 0.3;
          
          return {
            ...r,
            overallScore: contributionScore + savingsScore + attendanceScore,
          };
        })
        .sort((a, b) => b.overallScore - a.overallScore)
        .map((r, i) => ({
          memberId: r.memberId,
          name: r.name,
          avatar: r.avatar,
          role: r.role,
          score: r.overallScore,
          value: r.overallScore,
          rank: i + 1,
        }));
      setOverallLeaders(overallRanked.slice(0, 10));
    } catch (error) {
      console.error("Error loading leaderboards:", error);
      toast({
        title: t("common.error"),
        description: "Failed to load leaderboards",
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

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-700" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold">{rank}</span>;
    }
  };

  const renderLeaderboardTable = (leaders: LeaderboardEntry[], valueFormatter: (value: number) => string) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">Rank</TableHead>
          <TableHead>Member</TableHead>
          <TableHead>Role</TableHead>
          <TableHead className="text-right">Score</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leaders.map((leader) => (
          <TableRow 
            key={leader.memberId}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => navigate(`/admin/families/${selectedFamily}/members/${leader.memberId}`)}
          >
            <TableCell>
              <div className="flex items-center justify-center">
                {getRankIcon(leader.rank)}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={leader.avatar || undefined} />
                  <AvatarFallback>{leader.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{leader.name}</span>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{leader.role}</Badge>
            </TableCell>
            <TableCell className="text-right font-semibold">
              {valueFormatter(leader.value)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

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
              <Button variant="ghost" onClick={() => navigate("/admin/dashboard")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("common.back")}
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                  Member Leaderboard
                </h1>
                <p className="text-sm text-muted-foreground">
                  Top performing members across all metrics
                </p>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Family Selector */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Family</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {families.map((family) => (
                <Button
                  key={family.id}
                  variant={selectedFamily === family.id ? "default" : "outline"}
                  onClick={() => setSelectedFamily(family.id)}
                >
                  {family.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top 3 Overall */}
        {overallLeaders.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {overallLeaders.slice(0, 3).map((leader, index) => (
              <Card 
                key={leader.memberId}
                className={`cursor-pointer transition-all hover:scale-105 ${
                  index === 0 ? 'border-yellow-500 shadow-lg' : 
                  index === 1 ? 'border-gray-400' : 
                  'border-amber-700'
                }`}
                onClick={() => navigate(`/admin/families/${selectedFamily}/members/${leader.memberId}`)}
              >
                <CardContent className="pt-6 text-center">
                  <div className="flex justify-center mb-4">
                    {getRankIcon(index + 1)}
                  </div>
                  <Avatar className="w-20 h-20 mx-auto mb-4">
                    <AvatarImage src={leader.avatar || undefined} />
                    <AvatarFallback className="text-2xl">{leader.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <h3 className="font-bold text-lg">{leader.name}</h3>
                  <Badge variant="outline" className="mt-2">{leader.role}</Badge>
                  <p className="text-2xl font-bold mt-4 text-primary">
                    {leader.score.toFixed(1)} pts
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Leaderboard Tabs */}
        <Tabs defaultValue="overall" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overall">
              <Trophy className="w-4 h-4 mr-2" />
              Overall
            </TabsTrigger>
            <TabsTrigger value="contributions">
              <TrendingUp className="w-4 h-4 mr-2" />
              Contributions
            </TabsTrigger>
            <TabsTrigger value="savings">
              <TrendingUp className="w-4 h-4 mr-2" />
              Savings
            </TabsTrigger>
            <TabsTrigger value="attendance">
              <TrendingUp className="w-4 h-4 mr-2" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="chart">
              <TrendingUp className="w-4 h-4 mr-2" />
              Chart View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overall">
            <Card>
              <CardHeader>
                <CardTitle>Overall Performance Rankings</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Weighted score: 40% Contributions + 30% Savings + 30% Attendance
                </p>
              </CardHeader>
              <CardContent>
                {renderLeaderboardTable(overallLeaders, (value) => `${value.toFixed(1)} pts`)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contributions">
            <Card>
              <CardHeader>
                <CardTitle>Top Contributors</CardTitle>
              </CardHeader>
              <CardContent>
                {renderLeaderboardTable(contributionLeaders, formatCurrency)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="savings">
            <Card>
              <CardHeader>
                <CardTitle>Top Savers</CardTitle>
              </CardHeader>
              <CardContent>
                {renderLeaderboardTable(savingsLeaders, formatCurrency)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance">
            <Card>
              <CardHeader>
                <CardTitle>Best Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                {renderLeaderboardTable(attendanceLeaders, (value) => `${value.toFixed(1)}%`)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chart">
            <Card>
              <CardHeader>
                <CardTitle>Performance Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={overallLeaders.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="score" fill="hsl(var(--primary))" name="Overall Score" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default MemberLeaderboard;

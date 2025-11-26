import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { Loader2, ArrowLeft, Calendar, TrendingUp, Users, Clock } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns";

interface MonthlyStats {
  month: string;
  meetings: number;
  avgAttendance: number;
  avgDuration: number;
}

interface MeetingTypeStats {
  type: string;
  count: number;
  percentage: number;
}

const MeetingAnalyticsDashboard = () => {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { family, isLoading: authLoading } = useFamilyAuth(familySlug);
  const [loading, setLoading] = useState(true);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [meetingTypeStats, setMeetingTypeStats] = useState<MeetingTypeStats[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalMeetings: 0,
    avgAttendanceRate: 0,
    totalMembers: 0,
    completionRate: 0,
  });

  useEffect(() => {
    if (family) {
      loadAnalytics();
    }
  }, [family]);

  const loadAnalytics = async () => {
    if (!family) return;

    try {
      // Fetch meetings from last 12 months
      const twelveMonthsAgo = subMonths(new Date(), 12);
      const { data: meetingsData, error: meetingsError } = await supabase
        .from("meetings")
        .select("*")
        .eq("family_id", family.id)
        .gte("meeting_date", twelveMonthsAgo.toISOString())
        .order("meeting_date");

      if (meetingsError) throw meetingsError;

      // Fetch all family members count
      const { count: memberCount } = await supabase
        .from("family_members")
        .select("*", { count: "exact", head: true })
        .eq("family_id", family.id);

      // Fetch attendance records
      const meetingIds = meetingsData?.map(m => m.id) || [];
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance")
        .select("meeting_id, status")
        .in("meeting_id", meetingIds);

      if (attendanceError) throw attendanceError;

      // Calculate monthly stats
      const months = eachMonthOfInterval({
        start: twelveMonthsAgo,
        end: new Date()
      });

      const monthlyData: MonthlyStats[] = months.map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        
        const monthMeetings = meetingsData?.filter(m => {
          const meetingDate = new Date(m.meeting_date);
          return meetingDate >= monthStart && meetingDate <= monthEnd;
        }) || [];

        const monthAttendance = attendanceData?.filter(a => 
          monthMeetings.some(m => m.id === a.meeting_id)
        ) || [];

        const presentCount = monthAttendance.filter(a => a.status === "present").length;
        const avgAttendance = monthMeetings.length > 0 && memberCount
          ? Math.round((presentCount / (monthMeetings.length * memberCount)) * 100)
          : 0;

        return {
          month: format(month, "MMM yyyy"),
          meetings: monthMeetings.length,
          avgAttendance,
          avgDuration: 180, // Placeholder - could be calculated from meeting times
        };
      });

      setMonthlyStats(monthlyData);

      // Calculate meeting type distribution
      const typeMap = new Map<string, number>();
      meetingsData?.forEach(m => {
        const count = typeMap.get(m.meeting_type) || 0;
        typeMap.set(m.meeting_type, count + 1);
      });

      const totalMeetings = meetingsData?.length || 0;
      const typeStatsArray: MeetingTypeStats[] = Array.from(typeMap.entries()).map(([type, count]) => ({
        type: type.charAt(0).toUpperCase() + type.slice(1),
        count,
        percentage: totalMeetings > 0 ? Math.round((count / totalMeetings) * 100) : 0,
      }));

      setMeetingTypeStats(typeStatsArray);

      // Calculate overall stats
      const completedMeetings = meetingsData?.filter(m => m.is_completed).length || 0;
      const totalPresent = attendanceData?.filter(a => a.status === "present").length || 0;
      const avgAttendanceRate = totalMeetings > 0 && memberCount
        ? Math.round((totalPresent / (totalMeetings * memberCount)) * 100)
        : 0;

      setOverallStats({
        totalMeetings,
        avgAttendanceRate,
        totalMembers: memberCount || 0,
        completionRate: totalMeetings > 0 ? Math.round((completedMeetings / totalMeetings) * 100) : 0,
      });
    } catch (error: any) {
      console.error("Error loading analytics:", error);
      toast({
        title: "Error",
        description: "Failed to load meeting analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

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
              <h1 className="text-2xl font-bold text-foreground">Meeting Analytics</h1>
              <p className="text-sm text-muted-foreground">{family?.name}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Meetings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <div className="text-3xl font-bold">{overallStats.totalMeetings}</div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Last 12 months</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Attendance Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <div className="text-3xl font-bold">{overallStats.avgAttendanceRate}%</div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Across all meetings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                <div className="text-3xl font-bold">{overallStats.totalMembers}</div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Active family members</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-500" />
                <div className="text-3xl font-bold">{overallStats.completionRate}%</div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Meetings completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Meeting Frequency & Attendance Trends</CardTitle>
            <CardDescription>Monthly meeting count and attendance rates over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="meetings"
                  stroke="#10b981"
                  name="Meetings"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avgAttendance"
                  stroke="#3b82f6"
                  name="Avg Attendance %"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Meeting Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Meeting Type Distribution</CardTitle>
              <CardDescription>Breakdown of meetings by type</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={meetingTypeStats}
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.type}: ${entry.percentage}%`}
                  >
                    {meetingTypeStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Monthly Meeting Count */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Meeting Count</CardTitle>
              <CardDescription>Number of meetings held each month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="meetings" fill="#10b981" name="Meetings" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default MeetingAnalyticsDashboard;

import { DataCards } from "@/components/layout/DataCards";
import { useDevice } from "@/hooks/useDevice";
import { AnalyticsKpis, AnalyticsSummary, AnalyticsFilters, MobileChart } from "@/components/analytics/MobileAnalytics";
import { PageHeader } from "@/components/layout/PageHeader";
import { useCurrency } from "@/context/CurrencyContext";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { Loader2, ArrowLeft, TrendingUp, TrendingDown, Users, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface MemberStats {
  member_id: string;
  member_name: string;
  total_meetings: number;
  present: number;
  absent: number;
  excused: number;
  total_fines: number;
  attendance_rate: number;
  average_lateness: number;
}

const AttendanceAnalytics = () => {
  const { t } = useTranslation();
  const { isMobile } = useDevice();
  const { formatAmount } = useCurrency();
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { family, isLoading: authLoading } = useFamilyAuth(familySlug);
  const [loading, setLoading] = useState(true);
  const [memberStats, setMemberStats] = useState<MemberStats[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalMeetings: 0,
    totalFines: 0,
    averageAttendance: 0,
    bestAttender: "",
    worstAttender: "",
  });

  useEffect(() => {
    if (family) {
      loadAnalytics();
    }
  }, [family]);

  const loadAnalytics = async () => {
    if (!family) return;

    try {
      // Fetch all meetings
      const { data: meetingsData, error: meetingsError } = await supabase
        .from("meetings")
        .select("id")
        .eq("family_id", family.id);

      if (meetingsError) throw meetingsError;

      // Fetch family members
      const { data: familyMembersData, error: membersError } = await supabase
        .from("family_members")
        .select("id, user_id")
        .eq("family_id", family.id);

      if (membersError) throw membersError;

      // Fetch profiles
      const userIds = familyMembersData?.map(m => m.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Create member ID to name mapping
      const memberIdToUserId = new Map(familyMembersData?.map(m => [m.id, m.user_id]) || []);
      const userIdToName = new Map(profilesData?.map(p => [p.id, p.full_name]) || []);

      // Fetch all attendance records
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance")
        .select("*")
        .in("member_id", familyMembersData?.map(m => m.id) || []);

      if (attendanceError) throw attendanceError;

      // Calculate stats per member
      const membersMap = new Map<string, MemberStats>();

      attendanceData?.forEach((record: any) => {
        const memberId = record.member_id;
        const userId = memberIdToUserId.get(memberId);
        const memberName = userId ? userIdToName.get(userId) || "Unknown" : "Unknown";

        if (!membersMap.has(memberId)) {
          membersMap.set(memberId, {
            member_id: memberId,
            member_name: memberName,
            total_meetings: 0,
            present: 0,
            absent: 0,
            excused: 0,
            total_fines: 0,
            attendance_rate: 0,
            average_lateness: 0,
          });
        }

        const stats = membersMap.get(memberId);
        if (!stats) return;
        stats.total_meetings++;
        
        if (record.status === "present") stats.present++;
        else if (record.status === "absent") stats.absent++;
        else if (record.status === "excused") stats.excused++;

        stats.total_fines += record.fine_amount || 0;
        
        if (record.lateness_minutes) {
          stats.average_lateness = (stats.average_lateness * (stats.present - 1) + record.lateness_minutes) / stats.present;
        }
      });

      // Calculate attendance rates
      const statsArray = Array.from(membersMap.values()).map(stats => ({
        ...stats,
        attendance_rate: stats.total_meetings > 0 
          ? Math.round((stats.present / stats.total_meetings) * 100) 
          : 0,
        average_lateness: Math.round(stats.average_lateness),
      }));

      // Sort by attendance rate
      statsArray.sort((a, b) => b.attendance_rate - a.attendance_rate);

      setMemberStats(statsArray);

      // Calculate overall stats
      const totalFines = statsArray.reduce((sum, s) => sum + s.total_fines, 0);
      const avgAttendance = statsArray.length > 0
        ? Math.round(statsArray.reduce((sum, s) => sum + s.attendance_rate, 0) / statsArray.length)
        : 0;

      setOverallStats({
        totalMeetings: meetingsData?.length || 0,
        totalFines,
        averageAttendance: avgAttendance,
        bestAttender: statsArray[0]?.member_name || "N/A",
        worstAttender: statsArray[statsArray.length - 1]?.member_name || "N/A",
      });
    } catch (error: any) {
      console.error("Error loading analytics:", error);
      toast({
        title: t("famAttendanceAnalytics.error"),
        description: t("famAttendanceAnalytics.failedToLoadAnalytics"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ["#10b981", "#ef4444", "#3b82f6", "#f59e0b"];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {isMobile ? <PageHeader title={t("phase2.attendanceTitle")} backTo={`/family/${familySlug}`} /> : (<header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(`/family/${familySlug}`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("famAttendanceAnalytics.back")}
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{family?.name} - Attendance Analytics</h1>
              <p className="text-sm text-muted-foreground">{t("famAttendanceAnalytics.memberAttendanceTrendsAndInsights")}</p>
            </div>
          </div>
        </div>
      </header>)}

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Overview Stats */}
        <AnalyticsKpis className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("famAttendanceAnalytics.totalMeetings")}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="min-w-0">
              <div className="text-2xl font-bold">{overallStats.totalMeetings}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("famAttendanceAnalytics.averageAttendance")}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="min-w-0">
              <div className="text-2xl font-bold">{overallStats.averageAttendance}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("famAttendanceAnalytics.totalFines")}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="min-w-0">
              <div className="text-2xl font-bold">{formatAmount(overallStats.totalFines)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("famAttendanceAnalytics.bestAttender")}</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent className="min-w-0">
              <div className="text-sm font-bold truncate">{overallStats.bestAttender}</div>
            </CardContent>
          </Card>
        </AnalyticsKpis>

        {/* Attendance Rate Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t("famAttendanceAnalytics.attendanceRatesByMember")}</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            <MobileChart><ResponsiveContainer width="100%" height={400}>
              <BarChart data={memberStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="member_name" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="attendance_rate" fill="hsl(var(--primary))" name={t("phase2.attendancePercent")} />
              </BarChart>
            </ResponsiveContainer></MobileChart>
          </CardContent>
        </Card>

        {/* Member Stats Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t("famAttendanceAnalytics.detailedMemberStatistics")}</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
{isMobile ? <DataCards rows={memberStats} getRowKey={row => row.member_id} title={row => row.member_name} columns={[{ key: "0", label: t("famAttendanceAnalytics.meetings"), render: row => row.total_meetings }, { key: "1", label: t("famAttendanceAnalytics.rate"), render: row => <strong className="text-lg text-primary">{row.attendance_rate}%</strong> }, { key: "2", label: t("famAttendanceAnalytics.present"), render: row => row.present }, { key: "3", label: t("famAttendanceAnalytics.absent"), render: row => row.absent }, { key: "4", label: t("famAttendanceAnalytics.excused"), render: row => row.excused }, { key: "5", label: t("phase2.averageLate"), render: row => row.average_lateness }, { key: "6", label: t("famAttendanceAnalytics.fines"), render: row => formatAmount(row.total_fines) }]} /> : (            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">{t("famAttendanceAnalytics.member")}</th>
                    <th className="text-center p-2">{t("famAttendanceAnalytics.meetings")}</th>
                    <th className="text-center p-2">{t("famAttendanceAnalytics.present")}</th>
                    <th className="text-center p-2">{t("famAttendanceAnalytics.absent")}</th>
                    <th className="text-center p-2">{t("famAttendanceAnalytics.excused")}</th>
                    <th className="text-center p-2">{t("famAttendanceAnalytics.rate")}</th>
                    <th className="text-center p-2">{t("phase2.averageLate")}</th>
                    <th className="text-right p-2">{t("famAttendanceAnalytics.fines")}</th>
                  </tr>
                </thead>
                <tbody>
                  {memberStats.map((stats) => (
                    <tr key={stats.member_id} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{stats.member_name}</td>
                      <td className="text-center p-2">{stats.total_meetings}</td>
                      <td className="text-center p-2 text-green-600">{stats.present}</td>
                      <td className="text-center p-2 text-red-600">{stats.absent}</td>
                      <td className="text-center p-2 text-blue-600">{stats.excused}</td>
                      <td className="text-center p-2">
                        <span className={`font-semibold ${stats.attendance_rate >= 80 ? 'text-green-600' : stats.attendance_rate >= 50 ? 'text-orange-600' : 'text-red-600'}`}>
                          {stats.attendance_rate}%
                        </span>
                      </td>
                      <td className="text-center p-2">{stats.average_lateness}</td>
                      <td className="text-right p-2 font-medium">{formatAmount(stats.total_fines)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>)}
          </CardContent>
        </Card>

        {/* Fines Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>{t("famAttendanceAnalytics.finesDistribution")}</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            <MobileChart><ResponsiveContainer width="100%" height={300}>
              <BarChart data={memberStats.filter(s => s.total_fines > 0)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="member_name" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total_fines" fill="#ef4444" name={t("phase2.fines")} />
              </BarChart>
            </ResponsiveContainer></MobileChart>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AttendanceAnalytics;

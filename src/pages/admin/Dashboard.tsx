import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Users, Building2, Activity, TrendingUp, Shield, FileText, BarChart3, PieChart, Mail, Download, Globe, Layout, Trophy, Megaphone, UserCheck, HeartPulse } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Badge } from "@/components/ui/badge";
import ActivityWidget from "@/components/ActivityWidget";
import { AdminNotificationsList } from "@/components/admin/AdminNotificationsList";
import { LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface DashboardStats {
  totalFamilies: number;
  activeFamilies: number;
  totalMembers: number;
  totalAdmins: number;
  recentActivity: number;
  todayActivity: number;
  dau7d: number;
}

interface ActivityData {
  date: string;
  count: number;
}

interface ActionDistribution {
  action: string;
  count: number;
  fill: string;
}

interface RecentLog {
  id: string;
  action_type: string;
  entity_type: string;
  created_at: string;
  admin_profile?: {
    full_name: string;
  };
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalFamilies: 0,
    activeFamilies: 0,
    totalMembers: 0,
    totalAdmins: 0,
    recentActivity: 0,
    todayActivity: 0,
    dau7d: 0,
  });
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [actionDistribution, setActionDistribution] = useState<ActionDistribution[]>([]);

  useEffect(() => {
    checkAuthAndLoadStats();
  }, []);

  const checkAuthAndLoadStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check if super admin
      const { data: superAdminData } = await supabase
        .from("super_admins")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!superAdminData) {
        toast({
          title: t("admin.accessDenied"),
          description: t("admin.noPermission"),
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      await loadStats();
    } catch (error: any) {
      console.error("Auth check error:", error);
      navigate("/auth");
    }
  };

  const loadStats = async () => {
    try {
      // Get family statistics
      const { data: families } = await supabase
        .from("families")
        .select("id, is_active");
      
      const totalFamilies = families?.length || 0;
      const activeFamilies = families?.filter(f => f.is_active).length || 0;

      // Get member statistics
      const { data: members } = await supabase
        .from("family_members")
        .select("id");
      
      const totalMembers = members?.length || 0;

      // Get super admin count
      const { data: admins } = await supabase
        .from("super_admins")
        .select("id");
      
      const totalAdmins = admins?.length || 0;

      // Get recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: recentActivity } = await supabase
        .from("admin_logs")
        .select("id")
        .gte("created_at", sevenDaysAgo.toISOString());
      
      const recentActivityCount = recentActivity?.length || 0;

      // Get today's activity
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const { data: todayActivity } = await supabase
        .from("admin_logs")
        .select("id")
        .gte("created_at", todayStart.toISOString());
      
      const todayActivityCount = todayActivity?.length || 0;

      // Get all logs for charts
      const { data: allLogs } = await supabase
        .from("admin_logs")
        .select("*")
        .order("created_at", { ascending: false });

      // Process activity data for last 7 days
      if (allLogs) {
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return date.toISOString().split('T')[0];
        });

        const activityByDay = last7Days.map(date => ({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count: allLogs.filter(log => log.created_at.startsWith(date)).length
        }));
        setActivityData(activityByDay);

        // Process action distribution
        const actionCounts = allLogs.reduce((acc, log) => {
          acc[log.action_type] = (acc[log.action_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const colors = ['#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6'];
        const distribution = Object.entries(actionCounts).map(([action, count], index) => ({
          action,
          count,
          fill: colors[index % colors.length]
        }));
        setActionDistribution(distribution);
      }

      // Get recent logs with profiles
      const { data: logs } = await supabase
        .from("admin_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      if (logs && logs.length > 0) {
        const adminIds = [...new Set(logs.map(log => log.admin_user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", adminIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const logsWithProfiles = logs.map(log => ({
          ...log,
          admin_profile: profileMap.get(log.admin_user_id)
        }));
        setRecentLogs(logsWithProfiles);
      }

      // DAU last 7 days from activity_logs
      let dau7d = 0;
      try {
        const { data: au } = await supabase
          .from("activity_logs")
          .select("user_id")
          .gte("created_at", sevenDaysAgo.toISOString());
        dau7d = new Set((au || []).map((r: { user_id: string }) => r.user_id).filter(Boolean)).size;
      } catch (e) {
        console.warn("DAU lookup failed", e);
      }

      setStats({
        totalFamilies,
        activeFamilies,
        totalMembers,
        totalAdmins,
        recentActivity: recentActivityCount,
        todayActivity: todayActivityCount,
        dau7d,
      });
    } catch (error: any) {
      console.error("Error loading stats:", error);
      toast({
        title: t("common.error"),
        description: "Failed to load dashboard statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case "create":
      case "add":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "update":
      case "edit":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "delete":
      case "remove":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
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
              <Button variant="ghost" onClick={() => navigate("/admin/families")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("common.back")}
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Activity className="w-6 h-6" />
                  Admin Dashboard
                </h1>
                <p className="text-sm text-muted-foreground">System-wide statistics and activity</p>
              </div>
            </div>
            
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Families</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFamilies}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeFamilies} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMembers}</div>
              <p className="text-xs text-muted-foreground">
                Across all families
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Super Admins</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAdmins}</div>
              <p className="text-xs text-muted-foreground">
                System administrators
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentActivity}</div>
              <p className="text-xs text-muted-foreground">
                Last 7 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Activity</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayActivity}</div>
              <p className="text-xs text-muted-foreground">
                Actions performed today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Members/Family</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalFamilies > 0 
                  ? (stats.totalMembers / stats.totalFamilies).toFixed(1)
                  : '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Average family size
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users (7d)</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.dau7d}</div>
              <p className="text-xs text-muted-foreground">
                Distinct users with activity
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Notifications and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Admin Notifications */}
          <AdminNotificationsList />
          
          {/* Activity Widget */}
          <ActivityWidget limit={15} />
          
          {/* Activity Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Activity Trend (Last 7 Days)
              </CardTitle>
              <CardDescription>Daily administrative actions</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  count: {
                    label: "Actions",
                    color: "hsl(var(--primary))",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))", r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Action Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Action Distribution
              </CardTitle>
              <CardDescription>Breakdown by action type</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={actionDistribution.reduce((acc, item) => ({
                  ...acc,
                  [item.action]: {
                    label: item.action,
                    color: item.fill,
                  },
                }), {})}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={actionDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ action, percent }) => `${action} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      dataKey="count"
                    >
                      {actionDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </RechartsPie>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Recent Admin Activity
            </CardTitle>
            <CardDescription>Latest administrative actions in the system</CardDescription>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No recent activity
              </p>
            ) : (
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={getActionColor(log.action_type)}>
                        {log.action_type}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">
                          {log.admin_profile?.full_name || "Unknown Admin"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {log.entity_type}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                onClick={() => navigate("/admin/activity-logs")}
              >
                View All Activity Logs
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mt-8">
          <Button
            variant="outline"
            className="h-auto py-6"
            onClick={() => navigate("/admin/families")}
          >
            <div className="flex flex-col items-center gap-2">
              <Building2 className="w-8 h-8" />
              <span>Manage Families</span>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-6"
            onClick={() => navigate("/admin/global-analytics")}
          >
            <div className="flex flex-col items-center gap-2">
              <Globe className="w-8 h-8" />
              <span>Global Analytics</span>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-6"
            onClick={() => navigate("/admin/users")}
          >
            <div className="flex flex-col items-center gap-2">
              <Users className="w-8 h-8" />
              <span>User Management</span>
            </div>
          </Button>
            <Button
              variant="outline"
              className="h-auto py-6"
              onClick={() => navigate("/admin/digest-settings")}
            >
              <div className="flex flex-col items-center gap-2">
                <Mail className="w-8 h-8" />
                <span>Email Digests</span>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-6"
              onClick={() => navigate("/admin/customize-dashboard")}
            >
              <div className="flex flex-col items-center gap-2">
                <Layout className="w-8 h-8" />
                <span>Customize Dashboard</span>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-6"
              onClick={() => navigate("/admin/role-permissions")}
            >
              <div className="flex flex-col items-center gap-2">
                <Shield className="w-8 h-8" />
                <span>Role Permissions</span>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-6"
              onClick={() => navigate("/admin/user-activity")}
            >
              <div className="flex flex-col items-center gap-2">
                <Activity className="w-8 h-8" />
                <span>User Activity</span>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-6"
              onClick={() => navigate("/admin/leaderboard")}
            >
              <div className="flex flex-col items-center gap-2">
                <Trophy className="w-8 h-8 text-yellow-500" />
                <span>Leaderboard</span>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-6"
              onClick={() => navigate("/admin/activity-logs")}
            >
              <div className="flex flex-col items-center gap-2">
                <FileText className="w-8 h-8" />
                <span>Admin Logs</span>
              </div>
            </Button>
          <Button
            variant="outline"
            className="h-auto py-6"
            onClick={() => navigate("/admin/email-reports")}
          >
            <div className="flex flex-col items-center gap-2">
              <Mail className="w-8 h-8" />
              <span>Email Reports</span>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-6"
            onClick={() => navigate("/admin/export-scheduler")}
          >
            <div className="flex flex-col items-center gap-2">
              <Download className="w-8 h-8" />
              <span>Export Scheduler</span>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-6"
            onClick={() => navigate("/admin/announcements")}
          >
            <div className="flex flex-col items-center gap-2">
              <Megaphone className="w-8 h-8" />
              <span>Announcements</span>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-6"
            onClick={() => navigate("/admin/system-health")}
          >
            <div className="flex flex-col items-center gap-2">
              <HeartPulse className="w-8 h-8 text-green-500" />
              <span>System Health</span>
            </div>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Users, Building2, Activity, TrendingUp, Shield, FileText } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Badge } from "@/components/ui/badge";

interface DashboardStats {
  totalFamilies: number;
  activeFamilies: number;
  totalMembers: number;
  totalAdmins: number;
  recentActivity: number;
  todayActivity: number;
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
  });
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);

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

      setStats({
        totalFamilies,
        activeFamilies,
        totalMembers,
        totalAdmins,
        recentActivity: recentActivityCount,
        todayActivity: todayActivityCount,
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
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
            onClick={() => navigate("/admin/permissions")}
          >
            <div className="flex flex-col items-center gap-2">
              <Shield className="w-8 h-8" />
              <span>View Permissions</span>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-6"
            onClick={() => navigate("/admin/activity-logs")}
          >
            <div className="flex flex-col items-center gap-2">
              <FileText className="w-8 h-8" />
              <span>Activity Logs</span>
            </div>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;

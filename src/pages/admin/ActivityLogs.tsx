import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, FileText, Filter, Download } from "lucide-react";
import { exportToCSV, formatActivityLogsForExport } from "@/lib/export";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

interface AdminLog {
  id: string;
  admin_user_id: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  details: any;
  ip_address: string | null;
  created_at: string;
  admin_profile?: {
    full_name: string;
    email: string;
  };
}

const ActivityLogs = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterEntity, setFilterEntity] = useState<string>("all");

  useEffect(() => {
    checkAuthAndLoadLogs();
  }, []);

  const checkAuthAndLoadLogs = async () => {
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

      await loadLogs();
    } catch (error: any) {
      console.error("Auth check error:", error);
      navigate("/auth");
    }
  };

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Fetch admin profiles separately
      if (data && data.length > 0) {
        const adminIds = [...new Set(data.map(log => log.admin_user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", adminIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const logsWithProfiles = data.map(log => ({
          ...log,
          admin_profile: profileMap.get(log.admin_user_id)
        }));
        setLogs(logsWithProfiles);
      } else {
        setLogs([]);
      }
    } catch (error: any) {
      console.error("Error loading logs:", error);
      toast({
        title: t("common.error"),
        description: "Failed to load activity logs",
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

  const filteredLogs = logs.filter((log) => {
    if (filterAction !== "all" && log.action_type !== filterAction) return false;
    if (filterEntity !== "all" && log.entity_type !== filterEntity) return false;
    return true;
  });

  const uniqueActions = [...new Set(logs.map((log) => log.action_type))];
  const uniqueEntities = [...new Set(logs.map((log) => log.entity_type))];

  const handleExport = () => {
    const formatted = formatActivityLogsForExport(filteredLogs);
    exportToCSV(formatted, `activity-logs-${new Date().toISOString().split('T')[0]}`);
    toast({
      title: t("common.success"),
      description: "Activity logs exported successfully",
    });
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
                  <FileText className="w-6 h-6" />
                  Admin Activity Logs
                </h1>
                <p className="text-sm text-muted-foreground">Track all administrative actions</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {filteredLogs.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              )}
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Select value={filterAction} onValueChange={setFilterAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {uniqueActions.map((action) => (
                      <SelectItem key={action} value={action}>
                        {action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Select value={filterEntity} onValueChange={setFilterEntity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by entity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Entities</SelectItem>
                    {uniqueEntities.map((entity) => (
                      <SelectItem key={entity} value={entity}>
                        {entity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        <div className="space-y-3">
          {filteredLogs.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2 text-foreground">No activity logs yet</h3>
              <p className="text-muted-foreground">Admin actions will appear here</p>
            </Card>
          ) : (
            filteredLogs.map((log) => (
              <Card key={log.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={getActionColor(log.action_type)}>
                          {log.action_type}
                        </Badge>
                        <Badge variant="outline">
                          {log.entity_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "PPp")}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {log.admin_profile?.full_name || "Unknown Admin"} ({log.admin_profile?.email})
                        </p>
                        {log.details && (
                          <p className="text-sm text-muted-foreground">
                            {JSON.stringify(log.details, null, 2)}
                          </p>
                        )}
                        {log.ip_address && (
                          <p className="text-xs text-muted-foreground">IP: {log.ip_address}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default ActivityLogs;

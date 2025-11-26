import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, Download } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { Database } from "@/integrations/supabase/types";

interface ActivityLog {
  id: string;
  user_id: string | null;
  family_id: string | null;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  details: any;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
  families?: {
    name: string;
  };
}

export default function UserActivity() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionTypeFilter, setActionTypeFilter] = useState("all");

  useEffect(() => {
    checkSuperAdmin();
    fetchActivities();
  }, []);

  const checkSuperAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: isSuperAdmin } = await supabase
      .rpc("is_super_admin", { check_user_id: session.user.id });

    if (!isSuperAdmin) {
      toast({
        title: "Access Denied",
        description: "You must be a super admin to access this page",
        variant: "destructive",
      });
      navigate("/admin");
    }
  };

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from("activity_logs")
        .select(`
          *
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      // Fetch user profiles separately
      const userIds = [...new Set(data?.map(d => d.user_id).filter(Boolean))] as string[];
      const familyIds = [...new Set(data?.map(d => d.family_id).filter(Boolean))] as string[];

      const [profilesData, familiesData] = await Promise.all([
        userIds.length > 0 
          ? supabase.from("profiles").select("id, full_name, email").in("id", userIds)
          : { data: [] },
        familyIds.length > 0
          ? supabase.from("families").select("id, name").in("id", familyIds)
          : { data: [] }
      ]);

      const profilesMap = new Map<string, any>();
      profilesData.data?.forEach(p => profilesMap.set(p.id, p));
      
      const familiesMap = new Map<string, any>();
      familiesData.data?.forEach(f => familiesMap.set(f.id, f));

      const enrichedData = data?.map(activity => ({
        ...activity,
        profiles: activity.user_id ? profilesMap.get(activity.user_id) : null,
        families: activity.family_id ? familiesMap.get(activity.family_id) : null,
      })) || [];

      setActivities(enrichedData as ActivityLog[]);
    } catch (error) {
      console.error("Error fetching activities:", error);
      toast({
        title: "Error",
        description: "Failed to load activity logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const csv = [
      ["Date", "User", "Email", "Family", "Action", "Entity Type", "Details"],
      ...filteredActivities.map((activity) => [
        format(new Date(activity.created_at), "yyyy-MM-dd HH:mm:ss"),
        activity.profiles?.full_name || "System",
        activity.profiles?.email || "-",
        activity.families?.name || "-",
        activity.action_type,
        activity.entity_type || "-",
        JSON.stringify(activity.details || {}),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `user-activity-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const getActionBadgeColor = (actionType: string) => {
    if (actionType.includes("create")) return "bg-green-500";
    if (actionType.includes("update")) return "bg-blue-500";
    if (actionType.includes("delete")) return "bg-red-500";
    if (actionType.includes("login")) return "bg-purple-500";
    if (actionType.includes("view")) return "bg-gray-500";
    return "bg-slate-500";
  };

  const filteredActivities = activities.filter((activity) => {
    const matchesSearch =
      activity.profiles?.full_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      activity.profiles?.email
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      activity.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.entity_type?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      actionTypeFilter === "all" || activity.action_type === actionTypeFilter;

    return matchesSearch && matchesFilter;
  });

  const actionTypes = Array.from(
    new Set(activities.map((a) => a.action_type))
  ).sort();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">User Activity</h1>
              <p className="text-muted-foreground">
                Monitor all user actions across the system
              </p>
            </div>
          </div>

          <Button onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actionTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="secondary">
                {filteredActivities.length} activities
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading activities...
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No activities found
              </div>
            ) : (
              <div className="space-y-4">
                {filteredActivities.map((activity) => (
                  <Card key={activity.id} className="hover:bg-accent/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className={getActionBadgeColor(activity.action_type)}>
                              {activity.action_type}
                            </Badge>
                            {activity.entity_type && (
                              <Badge variant="outline">{activity.entity_type}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">
                              {activity.profiles?.full_name || "System"}
                            </span>
                            {activity.profiles?.email && (
                              <span className="text-muted-foreground">
                                ({activity.profiles.email})
                              </span>
                            )}
                            {activity.families?.name && (
                              <>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-muted-foreground">
                                  {activity.families.name}
                                </span>
                              </>
                            )}
                          </div>
                          {activity.details && Object.keys(activity.details).length > 0 && (
                            <div className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                              {JSON.stringify(activity.details, null, 2)}
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground text-right whitespace-nowrap ml-4">
                          {format(new Date(activity.created_at), "MMM d, yyyy")}
                          <br />
                          {format(new Date(activity.created_at), "HH:mm:ss")}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

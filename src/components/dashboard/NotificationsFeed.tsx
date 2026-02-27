import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Calendar, DollarSign, Users, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  action_type: string;
  entity_type: string | null;
  family_id: string | null;
  details: any;
  created_at: string;
  family_name?: string;
}

interface NotificationsFeedProps {
  userId: string;
  familyIds: string[];
}

const getActivityIcon = (actionType: string, entityType: string | null) => {
  if (entityType === "contributions" || entityType === "loans" || entityType === "savings") return DollarSign;
  if (entityType === "meetings") return Calendar;
  if (entityType === "family_members") return Users;
  if (actionType === "create") return CheckCircle;
  if (actionType === "update") return Clock;
  return Bell;
};

const getActivityLabel = (actionType: string, entityType: string | null) => {
  const entity = entityType?.replace(/_/g, " ") || "item";
  switch (actionType) {
    case "create": return `New ${entity} created`;
    case "update": return `${entity} updated`;
    case "delete": return `${entity} removed`;
    case "page_view": return "Page viewed";
    default: return `${actionType} on ${entity}`;
  }
};

export const NotificationsFeed = ({ userId, familyIds }: NotificationsFeedProps) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (familyIds.length === 0) {
      setLoading(false);
      return;
    }
    loadActivities();
  }, [familyIds]);

  const loadActivities = async () => {
    try {
      // Get recent activity logs for all user's families
      const { data, error } = await supabase
        .from("activity_logs")
        .select("id, action_type, entity_type, entity_id, family_id, details, created_at")
        .in("family_id", familyIds)
        .neq("action_type", "page_view")
        .order("created_at", { ascending: false })
        .limit(15);

      if (error) throw error;

      // Get family names
      const { data: families } = await supabase
        .from("families")
        .select("id, name")
        .in("id", familyIds);

      const familyMap = new Map(families?.map(f => [f.id, f.name]) || []);

      const enriched = (data || []).map(a => ({
        ...a,
        family_name: a.family_id ? familyMap.get(a.family_id) || "Unknown" : undefined,
      }));

      setActivities(enriched);
    } catch (error) {
      console.error("Error loading activities:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 mb-2" />)}
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Recent Updates</h3>
        {activities.length > 0 && (
          <Badge variant="secondary" className="ml-auto">{activities.length}</Badge>
        )}
      </div>
      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No recent updates</p>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {activities.map(activity => {
            const Icon = getActivityIcon(activity.action_type, activity.entity_type);
            return (
              <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="p-1.5 rounded-full bg-primary/10 mt-0.5">
                  <Icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {getActivityLabel(activity.action_type, activity.entity_type)}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {activity.family_name && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {activity.family_name}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

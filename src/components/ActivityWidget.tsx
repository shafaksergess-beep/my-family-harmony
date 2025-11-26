import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, DollarSign, CreditCard, Calendar, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityEvent {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  familyName?: string;
  userName?: string;
}

interface ActivityWidgetProps {
  familyId?: string;
  limit?: number;
}

const ActivityWidget = ({ familyId, limit = 10 }: ActivityWidgetProps) => {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    loadActivities();

    // Set up real-time subscription
    const channel = supabase
      .channel("activity-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contributions",
          ...(familyId ? { filter: `family_id=eq.${familyId}` } : {}),
        },
        () => loadActivities()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "loans",
          ...(familyId ? { filter: `family_id=eq.${familyId}` } : {}),
        },
        () => loadActivities()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "meetings",
          ...(familyId ? { filter: `family_id=eq.${familyId}` } : {}),
        },
        () => loadActivities()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const allActivities: ActivityEvent[] = [];

      // Load recent contributions
      const contributionsQuery = supabase
        .from("contributions")
        .select(`
          id,
          created_at,
          amount,
          type,
          family_members!inner(
            profiles!inner(full_name),
            families!inner(name)
          )
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (familyId) {
        contributionsQuery.eq("family_id", familyId);
      }

      const { data: contributions } = await contributionsQuery;

      if (contributions) {
        contributions.forEach((c: any) => {
          allActivities.push({
            id: `contribution-${c.id}`,
            type: "contribution",
            description: `${c.family_members?.profiles?.full_name} contributed ${Number(
              c.amount
            ).toLocaleString()} FCFA`,
            timestamp: c.created_at,
            familyName: c.family_members?.families?.name,
            userName: c.family_members?.profiles?.full_name,
          });
        });
      }

      // Load recent loans
      const loansQuery = supabase
        .from("loans")
        .select(`
          id,
          created_at,
          amount,
          status,
          family_members!inner(
            profiles!inner(full_name),
            families!inner(name)
          )
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (familyId) {
        loansQuery.eq("family_id", familyId);
      }

      const { data: loans } = await loansQuery;

      if (loans) {
        loans.forEach((l: any) => {
          allActivities.push({
            id: `loan-${l.id}`,
            type: "loan",
            description: `${
              l.family_members?.profiles?.full_name
            } requested ${Number(l.amount).toLocaleString()} FCFA loan`,
            timestamp: l.created_at,
            familyName: l.family_members?.families?.name,
            userName: l.family_members?.profiles?.full_name,
          });
        });
      }

      // Load recent meetings
      const meetingsQuery = supabase
        .from("meetings")
        .select(`
          id,
          created_at,
          meeting_type,
          families!inner(name)
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (familyId) {
        meetingsQuery.eq("family_id", familyId);
      }

      const { data: meetings } = await meetingsQuery;

      if (meetings) {
        meetings.forEach((m: any) => {
          allActivities.push({
            id: `meeting-${m.id}`,
            type: "meeting",
            description: `New ${m.meeting_type} meeting scheduled`,
            timestamp: m.created_at,
            familyName: m.families?.name,
          });
        });
      }

      // Sort by timestamp
      allActivities.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setActivities(allActivities.slice(0, limit));
    } catch (error) {
      console.error("Error loading activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "contribution":
        return <DollarSign className="h-4 w-4" />;
      case "loan":
        return <CreditCard className="h-4 w-4" />;
      case "meeting":
        return <Calendar className="h-4 w-4" />;
      case "member":
        return <Users className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "contribution":
        return "bg-green-100 dark:bg-green-950/20 text-green-700 dark:text-green-400";
      case "loan":
        return "bg-orange-100 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400";
      case "meeting":
        return "bg-blue-100 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400";
      case "member":
        return "bg-purple-100 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400";
      default:
        return "bg-muted";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No recent activity
          </p>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div
                    className={`p-2 rounded-full ${getTypeColor(activity.type)}`}
                  >
                    {getIcon(activity.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{activity.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {activity.familyName && (
                        <Badge variant="outline" className="text-xs">
                          {activity.familyName}
                        </Badge>
                      )}
                      <span>
                        {formatDistanceToNow(new Date(activity.timestamp), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityWidget;

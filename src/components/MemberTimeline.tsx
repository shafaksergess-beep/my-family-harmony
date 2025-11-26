import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, CreditCard, Calendar, PiggyBank, Award, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface TimelineEvent {
  id: string;
  date: string;
  type: "contribution" | "loan" | "meeting" | "savings" | "share" | "dividend";
  title: string;
  description: string;
  amount?: number;
  status?: string;
}

interface MemberTimelineProps {
  memberId: string;
  familyId: string;
}

const MemberTimeline = ({ memberId, familyId }: MemberTimelineProps) => {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    loadTimeline();
  }, [memberId]);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      const allEvents: TimelineEvent[] = [];

      // Load contributions
      const { data: contributions } = await supabase
        .from("contributions")
        .select("*")
        .eq("member_id", memberId)
        .eq("family_id", familyId)
        .order("contribution_date", { ascending: false });

      if (contributions) {
        contributions.forEach((c) => {
          allEvents.push({
            id: `contribution-${c.id}`,
            date: c.contribution_date,
            type: "contribution",
            title: `${c.type} Contribution`,
            description: `Contributed ${c.amount.toLocaleString()} FCFA`,
            amount: Number(c.amount),
            status: c.status,
          });
        });
      }

      // Load loans
      const { data: loans } = await supabase
        .from("loans")
        .select("*")
        .eq("member_id", memberId)
        .eq("family_id", familyId)
        .order("created_at", { ascending: false });

      if (loans) {
        loans.forEach((l) => {
          allEvents.push({
            id: `loan-${l.id}`,
            date: l.created_at || "",
            type: "loan",
            title: "Loan Request",
            description: `Applied for ${Number(l.amount).toLocaleString()} FCFA loan - ${l.purpose}`,
            amount: Number(l.amount),
            status: l.status,
          });
        });
      }

      // Load attendance
      const { data: attendance } = await supabase
        .from("attendance")
        .select(`
          *,
          meetings!inner(meeting_date, meeting_type)
        `)
        .eq("member_id", memberId)
        .order("created_at", { ascending: false });

      if (attendance) {
        attendance.forEach((a: any) => {
          allEvents.push({
            id: `attendance-${a.id}`,
            date: a.meetings.meeting_date,
            type: "meeting",
            title: `${a.meetings.meeting_type} Meeting`,
            description: `Attendance: ${a.status}`,
            status: a.status,
          });
        });
      }

      // Load savings
      const { data: savings } = await supabase
        .from("savings")
        .select("*")
        .eq("member_id", memberId)
        .eq("family_id", familyId)
        .order("month", { ascending: false });

      if (savings) {
        savings.forEach((s) => {
          allEvents.push({
            id: `savings-${s.id}`,
            date: s.month,
            type: "savings",
            title: "Monthly Savings",
            description: `Saved ${Number(s.amount).toLocaleString()} FCFA`,
            amount: Number(s.amount),
          });
        });
      }

      // Load shares
      const { data: shares } = await supabase
        .from("shares")
        .select("*")
        .eq("member_id", memberId)
        .eq("family_id", familyId)
        .order("purchase_date", { ascending: false });

      if (shares) {
        shares.forEach((s) => {
          allEvents.push({
            id: `share-${s.id}`,
            date: s.purchase_date,
            type: "share",
            title: "Share Purchase",
            description: `Purchased share #${s.share_number} - ${Number(s.share_value).toLocaleString()} FCFA`,
            amount: Number(s.share_value),
          });
        });
      }

      // Sort all events by date
      allEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setEvents(allEvents);
    } catch (error) {
      console.error("Error loading timeline:", error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "contribution":
        return <DollarSign className="h-5 w-5" />;
      case "loan":
        return <CreditCard className="h-5 w-5" />;
      case "meeting":
        return <Calendar className="h-5 w-5" />;
      case "savings":
        return <PiggyBank className="h-5 w-5" />;
      case "share":
        return <Award className="h-5 w-5" />;
      case "dividend":
        return <TrendingUp className="h-5 w-5" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return "bg-muted";
    switch (status.toLowerCase()) {
      case "paid":
      case "present":
      case "approved":
      case "disbursed":
        return "bg-green-100 dark:bg-green-950/20 text-green-700 dark:text-green-400";
      case "pending":
      case "late":
        return "bg-yellow-100 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400";
      case "absent":
      case "rejected":
        return "bg-red-100 dark:bg-red-950/20 text-red-700 dark:text-red-400";
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
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Activity Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No activity recorded yet
          </p>
        ) : (
          <div className="relative space-y-4">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

            {events.map((event, index) => (
              <div key={event.id} className="relative flex gap-4">
                {/* Icon */}
                <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-background bg-card">
                  {getIcon(event.type)}
                </div>

                {/* Content */}
                <div className="flex-1 space-y-1 pb-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{event.title}</p>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(event.date), "MMM dd, yyyy")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                  {event.status && (
                    <Badge variant="outline" className={getStatusColor(event.status)}>
                      {event.status}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MemberTimeline;

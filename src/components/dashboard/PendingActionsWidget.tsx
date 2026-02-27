import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, DollarSign, CreditCard, Calendar } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";

interface PendingAction {
  type: "contribution" | "loan" | "meeting";
  familyName: string;
  familySlug: string;
  description: string;
  amount?: number;
  date?: string;
}

interface PendingActionsWidgetProps {
  userId: string;
  families: { family_id: string; family_name: string; family_slug: string }[];
}

export const PendingActionsWidget = ({ userId, families }: PendingActionsWidgetProps) => {
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  const { formatAmount } = useCurrency();

  useEffect(() => {
    if (families.length === 0) {
      setLoading(false);
      return;
    }
    loadPendingActions();
  }, [families, userId]);

  const loadPendingActions = async () => {
    try {
      const familyIds = families.map(f => f.family_id);
      const familyMap = new Map(families.map(f => [f.family_id, f]));

      const pending: PendingAction[] = [];

      // Get pending contributions for the user
      const { data: memberIds } = await supabase
        .from("family_members")
        .select("id, family_id")
        .eq("user_id", userId)
        .in("family_id", familyIds);

      if (memberIds && memberIds.length > 0) {
        const mIds = memberIds.map(m => m.id);
        const memberFamilyMap = new Map(memberIds.map(m => [m.id, m.family_id]));

        // Pending contributions
        const { data: contributions } = await supabase
          .from("contributions")
          .select("id, amount, contribution_date, member_id, family_id")
          .in("member_id", mIds)
          .eq("status", "pending")
          .order("contribution_date", { ascending: true })
          .limit(10);

        contributions?.forEach(c => {
          const fam = familyMap.get(c.family_id);
          if (fam) {
            pending.push({
              type: "contribution",
              familyName: fam.family_name,
              familySlug: fam.family_slug,
              description: `Contribution due`,
              amount: Number(c.amount),
              date: c.contribution_date,
            });
          }
        });

        // Active loans with outstanding balance
        const { data: loans } = await supabase
          .from("loans")
          .select("id, amount, amount_paid, due_date, family_id")
          .in("member_id", mIds)
          .in("status", ["approved", "disbursed"])
          .limit(10);

        loans?.forEach(l => {
          const outstanding = Number(l.amount) - Number(l.amount_paid || 0);
          if (outstanding > 0) {
            const fam = familyMap.get(l.family_id);
            if (fam) {
              pending.push({
                type: "loan",
                familyName: fam.family_name,
                familySlug: fam.family_slug,
                description: `Loan repayment outstanding`,
                amount: outstanding,
                date: l.due_date || undefined,
              });
            }
          }
        });
      }

      // Upcoming meetings (next 30 days)
      const now = new Date();
      const in30Days = new Date();
      in30Days.setDate(now.getDate() + 30);

      const { data: meetings } = await supabase
        .from("meetings")
        .select("id, meeting_type, meeting_date, family_id")
        .in("family_id", familyIds)
        .gte("meeting_date", now.toISOString().split("T")[0])
        .lte("meeting_date", in30Days.toISOString().split("T")[0])
        .eq("is_completed", false)
        .order("meeting_date", { ascending: true })
        .limit(5);

      meetings?.forEach(m => {
        const fam = familyMap.get(m.family_id);
        if (fam) {
          pending.push({
            type: "meeting",
            familyName: fam.family_name,
            familySlug: fam.family_slug,
            description: `${m.meeting_type?.replace(/_/g, " ") || "Meeting"} scheduled`,
            date: m.meeting_date,
          });
        }
      });

      setActions(pending);
    } catch (error) {
      console.error("Error loading pending actions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "contribution": return DollarSign;
      case "loan": return CreditCard;
      case "meeting": return Calendar;
      default: return AlertTriangle;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case "contribution": return "text-amber-600";
      case "loan": return "text-red-600";
      case "meeting": return "text-blue-600";
      default: return "text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 mb-2" />)}
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-amber-500" />
        <h3 className="text-lg font-semibold">Pending Actions</h3>
        {actions.length > 0 && (
          <Badge variant="destructive" className="ml-auto">{actions.length}</Badge>
        )}
      </div>
      {actions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">🎉 You're all caught up!</p>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {actions.map((action, idx) => {
            const Icon = getIcon(action.type);
            const color = getColor(action.type);
            return (
              <div key={idx} className="flex items-start gap-3 p-2 rounded-lg border">
                <div className={`p-1.5 rounded-full bg-muted mt-0.5`}>
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{action.description}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {action.familyName}
                    </Badge>
                    {action.amount && (
                      <span className="text-xs font-medium text-foreground">
                        {formatAmount(action.amount)}
                      </span>
                    )}
                    {action.date && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(action.date).toLocaleDateString()}
                      </span>
                    )}
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

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, TrendingUp, PiggyBank, CreditCard } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";

interface FamilyFinancial {
  familyName: string;
  familySlug: string;
  totalContributions: number;
  totalSavings: number;
  outstandingLoans: number;
  totalShares: number;
}

interface FinancialOverviewWidgetProps {
  userId: string;
  families: { family_id: string; family_name: string; family_slug: string }[];
}

export const FinancialOverviewWidget = ({ userId, families }: FinancialOverviewWidgetProps) => {
  const [data, setData] = useState<FamilyFinancial[]>([]);
  const [loading, setLoading] = useState(true);
  const { formatAmount } = useCurrency();

  useEffect(() => {
    if (families.length === 0) {
      setLoading(false);
      return;
    }
    loadFinancials();
  }, [families, userId]);

  const loadFinancials = async () => {
    try {
      const familyIds = families.map(f => f.family_id);

      // Get member IDs for user across families
      const { data: members } = await supabase
        .from("family_members")
        .select("id, family_id")
        .eq("user_id", userId)
        .in("family_id", familyIds);

      if (!members || members.length === 0) {
        setLoading(false);
        return;
      }

      const mIds = members.map(m => m.id);
      const memberFamilyMap = new Map(members.map(m => [m.id, m.family_id]));
      const familyMap = new Map(families.map(f => [f.family_id, f]));

      // Fetch all financial data in parallel
      const [contribRes, savingsRes, loansRes, sharesRes] = await Promise.all([
        supabase.from("contributions").select("amount, member_id, family_id").in("member_id", mIds).eq("status", "paid"),
        supabase.from("savings").select("amount, member_id, family_id").in("member_id", mIds),
        supabase.from("loans").select("amount, amount_paid, member_id, family_id").in("member_id", mIds).in("status", ["approved", "disbursed"]),
        supabase.from("shares").select("share_count, share_value, member_id, family_id").in("member_id", mIds).eq("is_active", true),
      ]);

      // Aggregate per family
      const familyData = new Map<string, FamilyFinancial>();
      families.forEach(f => {
        familyData.set(f.family_id, {
          familyName: f.family_name,
          familySlug: f.family_slug,
          totalContributions: 0,
          totalSavings: 0,
          outstandingLoans: 0,
          totalShares: 0,
        });
      });

      contribRes.data?.forEach(c => {
        const d = familyData.get(c.family_id);
        if (d) d.totalContributions += Number(c.amount);
      });

      savingsRes.data?.forEach(s => {
        const d = familyData.get(s.family_id);
        if (d) d.totalSavings += Number(s.amount);
      });

      loansRes.data?.forEach(l => {
        const d = familyData.get(l.family_id);
        if (d) d.outstandingLoans += Number(l.amount) - Number(l.amount_paid || 0);
      });

      sharesRes.data?.forEach(s => {
        const d = familyData.get(s.family_id);
        if (d) d.totalShares += (Number(s.share_count) || 1) * Number(s.share_value);
      });

      setData(Array.from(familyData.values()).filter(d =>
        d.totalContributions > 0 || d.totalSavings > 0 || d.outstandingLoans > 0 || d.totalShares > 0
      ));
    } catch (error) {
      console.error("Error loading financials:", error);
    } finally {
      setLoading(false);
    }
  };

  // Totals
  const totals = data.reduce(
    (acc, d) => ({
      contributions: acc.contributions + d.totalContributions,
      savings: acc.savings + d.totalSavings,
      loans: acc.loans + d.outstandingLoans,
      shares: acc.shares + d.totalShares,
    }),
    { contributions: 0, savings: 0, loans: 0, shares: 0 }
  );

  if (loading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Wallet className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">My Financial Summary</h3>
      </div>

      {/* Global totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border">
          <TrendingUp className="w-4 h-4 text-green-600 mb-1" />
          <p className="text-xs text-muted-foreground">Total Contributions</p>
          <p className="text-lg font-bold">{formatAmount(totals.contributions)}</p>
        </div>
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border">
          <PiggyBank className="w-4 h-4 text-blue-600 mb-1" />
          <p className="text-xs text-muted-foreground">Total Savings</p>
          <p className="text-lg font-bold">{formatAmount(totals.savings)}</p>
        </div>
        <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border">
          <CreditCard className="w-4 h-4 text-orange-600 mb-1" />
          <p className="text-xs text-muted-foreground">Outstanding Loans</p>
          <p className="text-lg font-bold">{formatAmount(totals.loans)}</p>
        </div>
        <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border">
          <Wallet className="w-4 h-4 text-purple-600 mb-1" />
          <p className="text-xs text-muted-foreground">Shares Value</p>
          <p className="text-lg font-bold">{formatAmount(totals.shares)}</p>
        </div>
      </div>

      {/* Per-family breakdown */}
      {data.length > 1 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Per Family</p>
          {data.map((d, idx) => (
            <div key={idx} className="p-3 rounded-lg border">
              <p className="text-sm font-semibold mb-2">{d.familyName}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Contributions: </span>
                  <span className="font-medium">{formatAmount(d.totalContributions)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Savings: </span>
                  <span className="font-medium">{formatAmount(d.totalSavings)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Loans: </span>
                  <span className="font-medium">{formatAmount(d.outstandingLoans)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Shares: </span>
                  <span className="font-medium">{formatAmount(d.totalShares)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

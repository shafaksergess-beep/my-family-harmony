import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { useCurrency } from "@/context/CurrencyContext";
import { Loader2, ArrowLeft, Download, FileText, TrendingUp, TrendingDown, PiggyBank, CreditCard } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface MemberProfile {
  member_id: string;
  full_name: string;
}

interface ReportContribution {
  id: string;
  member_name: string;
  amount: number;
  status: string;
  contribution_date: string;
  type: string;
  house_id: string | null;
}

interface ReportLoan {
  id: string;
  member_name: string;
  amount: number;
  amount_paid: number;
  status: string;
}

interface ReportSaving {
  id: string;
  member_name: string;
  amount: number;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = subMonths(new Date(), i);
  return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy") };
});

const FamilyReports = () => {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { family, isLoading: authLoading } = useFamilyAuth(familySlug);
  const { formatAmount } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));

  const [contributions, setContributions] = useState<ReportContribution[]>([]);
  const [loans, setLoans] = useState<ReportLoan[]>([]);
  const [savings, setSavings] = useState<ReportSaving[]>([]);
  const [memberMap, setMemberMap] = useState<Map<string, string>>(new Map());

  // Trend data (last 6 months)
  const [contributionTrend, setContributionTrend] = useState<Array<{ month: string; amount: number }>>([]);
  const [savingsTrend, setSavingsTrend] = useState<Array<{ month: string; amount: number }>>([]);

  const loadMemberMap = useCallback(async () => {
    if (!family) return new Map<string, string>();
    const { data: members } = await supabase
      .from("family_members")
      .select("id, user_id")
      .eq("family_id", family.id);
    if (!members) return new Map<string, string>();

    const userIds = members.map((m) => m.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    const userToName = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);
    const map = new Map<string, string>();
    members.forEach((m) => map.set(m.id, userToName.get(m.user_id) || "Unknown"));
    return map;
  }, [family]);

  const loadReportData = useCallback(async () => {
    if (!family) return;
    setLoading(true);

    try {
      const mMap = await loadMemberMap();
      setMemberMap(mMap);

      const monthStart = `${selectedMonth}-01`;
      const monthEnd = format(endOfMonth(new Date(monthStart)), "yyyy-MM-dd");

      // Contributions for selected month
      const { data: contribs } = await supabase
        .from("contributions")
        .select("id, member_id, amount, status, contribution_date, type, house_id")
        .eq("family_id", family.id)
        .gte("contribution_date", monthStart)
        .lte("contribution_date", monthEnd)
        .order("contribution_date", { ascending: true });

      setContributions(
        (contribs || []).map((c) => ({
          id: c.id,
          member_name: mMap.get(c.member_id) || "Unknown",
          amount: c.amount,
          status: c.status,
          contribution_date: c.contribution_date,
          type: c.type,
          house_id: c.house_id,
        }))
      );

      // Loans (all active/pending for the family)
      const { data: loansData } = await supabase
        .from("loans")
        .select("id, member_id, amount, amount_paid, status")
        .eq("family_id", family.id)
        .in("status", ["active", "pending", "approved"]);

      setLoans(
        (loansData || []).map((l) => ({
          id: l.id,
          member_name: mMap.get(l.member_id) || "Unknown",
          amount: l.amount,
          amount_paid: l.amount_paid || 0,
          status: l.status,
        }))
      );

      // Savings for selected month
      const { data: savingsData } = await supabase
        .from("savings")
        .select("id, member_id, amount")
        .eq("family_id", family.id)
        .gte("month", monthStart)
        .lte("month", monthEnd)
        .eq("status", "approved");

      setSavings(
        (savingsData || []).map((s) => ({
          id: s.id,
          member_name: mMap.get(s.member_id) || "Unknown",
          amount: s.amount,
        }))
      );

      // Contribution trend (last 6 months)
      const trendData: Array<{ month: string; amount: number }> = [];
      const savTrendData: Array<{ month: string; amount: number }> = [];
      for (let i = 5; i >= 0; i--) {
        const m = subMonths(new Date(monthStart), i);
        const ms = format(startOfMonth(m), "yyyy-MM-dd");
        const me = format(endOfMonth(m), "yyyy-MM-dd");

        const { data: mc } = await supabase
          .from("contributions")
          .select("amount")
          .eq("family_id", family.id)
          .eq("status", "paid")
          .gte("contribution_date", ms)
          .lte("contribution_date", me);

        trendData.push({
          month: format(m, "MMM"),
          amount: (mc || []).reduce((s, c) => s + Number(c.amount), 0),
        });

        const { data: ms2 } = await supabase
          .from("savings")
          .select("amount")
          .eq("family_id", family.id)
          .eq("status", "approved")
          .gte("month", ms)
          .lte("month", me);

        savTrendData.push({
          month: format(m, "MMM"),
          amount: (ms2 || []).reduce((s, c) => s + Number(c.amount), 0),
        });
      }
      setContributionTrend(trendData);
      setSavingsTrend(savTrendData);
    } catch (error) {
      console.error("Error loading report data:", error);
    } finally {
      setLoading(false);
    }
  }, [family, selectedMonth, loadMemberMap]);

  useEffect(() => {
    if (family) loadReportData();
  }, [family, loadReportData]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalContributions = contributions.reduce((s, c) => s + c.amount, 0);
  const paidContributions = contributions.filter((c) => c.status === "paid").reduce((s, c) => s + c.amount, 0);
  const totalLoansIssued = loans.reduce((s, l) => s + l.amount, 0);
  const totalOutstanding = loans.reduce((s, l) => s + (l.amount - l.amount_paid), 0);
  const repaymentProgress = totalLoansIssued > 0 ? Math.round((loans.reduce((s, l) => s + l.amount_paid, 0) / totalLoansIssued) * 100) : 0;
  const totalSavings = savings.reduce((s, sv) => s + sv.amount, 0);
  const pendingContributions = contributions.filter((c) => c.status === "pending").length;
  const monthLabel = format(new Date(selectedMonth + "-01"), "MMMM yyyy");
  const generatedAt = format(new Date(), "PPpp");

  return (
    <div className="min-h-screen bg-[#fafbfc] dark:bg-background print:bg-white">
      {/* Navigation Header - hidden on print */}
      <header className="border-b border-border bg-card print:hidden">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(`/family/${familySlug}`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Financial Reports</h1>
              <p className="text-sm text-muted-foreground">Accounting-grade monthly report</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => window.print()}>
              <Download className="w-4 h-4 mr-2" />
              Print / PDF
            </Button>
          </div>
        </div>
      </header>

      {/* Report Body */}
      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-0">
        {/* ═══ Cover Header ═══ */}
        <div className="bg-[#1a2332] dark:bg-[#0f1729] text-white rounded-t-xl p-8 print:rounded-none">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-[#c9a84c]/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#c9a84c]" />
                </div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#c9a84c] font-semibold">Monthly Financial Report</p>
              </div>
              <h2 className="text-3xl font-bold tracking-tight">{family?.name}</h2>
              <p className="text-white/60 mt-1 text-sm">{monthLabel}</p>
            </div>
            <div className="text-right text-xs text-white/40 space-y-1">
              <p>Generated: {generatedAt}</p>
              <p>Version 1.0</p>
            </div>
          </div>
        </div>

        {/* ═══ Executive Summary ═══ */}
        <div className="bg-white dark:bg-card border border-t-0 border-border p-8">
          <h3 className="text-xs uppercase tracking-[0.15em] text-[#1a2332] dark:text-foreground font-bold mb-6 flex items-center gap-2">
            <span className="w-8 h-[2px] bg-[#c9a84c]" />
            Executive Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <SummaryCard icon={TrendingUp} label="Total Contributions" value={formatAmount(totalContributions)} accent="text-emerald-600" />
            <SummaryCard icon={CreditCard} label="Loans Issued" value={formatAmount(totalLoansIssued)} accent="text-blue-600" />
            <SummaryCard icon={TrendingDown} label="Outstanding Loans" value={formatAmount(totalOutstanding)} accent="text-orange-600" />
            <SummaryCard icon={PiggyBank} label="Total Savings" value={formatAmount(totalSavings)} accent="text-purple-600" />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-[#c9a84c] pl-4">
            For {monthLabel}, the family recorded{" "}
            <strong>{formatAmount(paidContributions)}</strong> in paid contributions with{" "}
            <strong>{pendingContributions}</strong> pending obligation{pendingContributions !== 1 ? "s" : ""}.
            {totalOutstanding > 0
              ? ` Outstanding loan balance stands at ${formatAmount(totalOutstanding)} with a ${repaymentProgress}% repayment progress.`
              : " All loans are in good standing."}
            {totalSavings > 0 ? ` Members collectively saved ${formatAmount(totalSavings)} this period.` : ""}
          </p>
        </div>

        {/* ═══ Contribution Trend Chart ═══ */}
        <div className="bg-white dark:bg-card border border-t-0 border-border p-8">
          <h3 className="text-xs uppercase tracking-[0.15em] text-[#1a2332] dark:text-foreground font-bold mb-4 flex items-center gap-2">
            <span className="w-8 h-[2px] bg-[#c9a84c]" />
            Contribution & Savings Trends
          </h3>
          <div className="h-[220px] print:h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={contributionTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11, fill: "#6b7280" }} />
                <Tooltip formatter={(v: number) => formatAmount(v)} />
                <Legend />
                <Line type="monotone" dataKey="amount" data={contributionTrend} stroke="#1a2332" strokeWidth={2} name="Contributions" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="h-[180px] mt-4 print:h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={savingsTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11, fill: "#6b7280" }} />
                <Tooltip formatter={(v: number) => formatAmount(v)} />
                <Bar dataKey="amount" fill="#c9a84c" name="Savings" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ═══ Contributions Ledger ═══ */}
        <div className="bg-white dark:bg-card border border-t-0 border-border p-8">
          <h3 className="text-xs uppercase tracking-[0.15em] text-[#1a2332] dark:text-foreground font-bold mb-4 flex items-center gap-2">
            <span className="w-8 h-[2px] bg-[#c9a84c]" />
            Contributions Ledger
          </h3>
          {contributions.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-6 text-center">No contributions recorded for {monthLabel}.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-[#1a2332] dark:border-foreground">
                    <th className="text-left py-2 font-semibold text-[#1a2332] dark:text-foreground">Member</th>
                    <th className="text-left py-2 font-semibold text-[#1a2332] dark:text-foreground">Type</th>
                    <th className="text-right py-2 font-semibold text-[#1a2332] dark:text-foreground">Amount</th>
                    <th className="text-center py-2 font-semibold text-[#1a2332] dark:text-foreground">Status</th>
                    <th className="text-right py-2 font-semibold text-[#1a2332] dark:text-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {contributions.map((c, i) => (
                    <tr key={c.id} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-muted/20" : ""}`}>
                      <td className="py-2.5">
                        {c.member_name}
                        {c.house_id && <span className="text-xs text-muted-foreground ml-1">({c.house_id})</span>}
                      </td>
                      <td className="py-2.5 capitalize">{c.type}</td>
                      <td className="py-2.5 text-right font-mono font-medium">{formatAmount(c.amount)}</td>
                      <td className="py-2.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${c.status === "paid" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                          {c.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-muted-foreground">{format(new Date(c.contribution_date), "dd MMM yyyy")}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#1a2332] dark:border-foreground font-bold">
                    <td colSpan={2} className="py-2">Total</td>
                    <td className="py-2 text-right font-mono">{formatAmount(totalContributions)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* ═══ Loan Ledger ═══ */}
        <div className="bg-white dark:bg-card border border-t-0 border-border p-8">
          <h3 className="text-xs uppercase tracking-[0.15em] text-[#1a2332] dark:text-foreground font-bold mb-4 flex items-center gap-2">
            <span className="w-8 h-[2px] bg-[#c9a84c]" />
            Loan Ledger
          </h3>
          {loans.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-6 text-center">No active loans.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-[#1a2332] dark:border-foreground">
                    <th className="text-left py-2 font-semibold text-[#1a2332] dark:text-foreground">Member</th>
                    <th className="text-right py-2 font-semibold text-[#1a2332] dark:text-foreground">Principal</th>
                    <th className="text-right py-2 font-semibold text-[#1a2332] dark:text-foreground">Paid</th>
                    <th className="text-right py-2 font-semibold text-[#1a2332] dark:text-foreground">Outstanding</th>
                    <th className="text-center py-2 font-semibold text-[#1a2332] dark:text-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map((l, i) => (
                    <tr key={l.id} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-muted/20" : ""}`}>
                      <td className="py-2.5">{l.member_name}</td>
                      <td className="py-2.5 text-right font-mono">{formatAmount(l.amount)}</td>
                      <td className="py-2.5 text-right font-mono text-emerald-600">{formatAmount(l.amount_paid)}</td>
                      <td className="py-2.5 text-right font-mono font-medium text-orange-600">{formatAmount(l.amount - l.amount_paid)}</td>
                      <td className="py-2.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${l.status === "active" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
                          {l.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#1a2332] dark:border-foreground font-bold">
                    <td className="py-2">Totals</td>
                    <td className="py-2 text-right font-mono">{formatAmount(totalLoansIssued)}</td>
                    <td className="py-2 text-right font-mono text-emerald-600">{formatAmount(loans.reduce((s, l) => s + l.amount_paid, 0))}</td>
                    <td className="py-2 text-right font-mono text-orange-600">{formatAmount(totalOutstanding)}</td>
                    <td className="py-2 text-center text-xs text-muted-foreground">{repaymentProgress}% repaid</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* ═══ Savings Ledger ═══ */}
        <div className="bg-white dark:bg-card border border-t-0 border-border p-8">
          <h3 className="text-xs uppercase tracking-[0.15em] text-[#1a2332] dark:text-foreground font-bold mb-4 flex items-center gap-2">
            <span className="w-8 h-[2px] bg-[#c9a84c]" />
            Savings Ledger
          </h3>
          {savings.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-6 text-center">No savings recorded for {monthLabel}.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-[#1a2332] dark:border-foreground">
                    <th className="text-left py-2 font-semibold text-[#1a2332] dark:text-foreground">Member</th>
                    <th className="text-right py-2 font-semibold text-[#1a2332] dark:text-foreground">Amount Saved</th>
                  </tr>
                </thead>
                <tbody>
                  {savings.map((s, i) => (
                    <tr key={s.id} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-muted/20" : ""}`}>
                      <td className="py-2.5">{s.member_name}</td>
                      <td className="py-2.5 text-right font-mono font-medium">{formatAmount(s.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#1a2332] dark:border-foreground font-bold">
                    <td className="py-2">Total</td>
                    <td className="py-2 text-right font-mono">{formatAmount(totalSavings)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* ═══ Notes & Observations ═══ */}
        <div className="bg-white dark:bg-card border border-t-0 border-border p-8">
          <h3 className="text-xs uppercase tracking-[0.15em] text-[#1a2332] dark:text-foreground font-bold mb-4 flex items-center gap-2">
            <span className="w-8 h-[2px] bg-[#c9a84c]" />
            Notes & Observations
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
            {pendingContributions > 0 && (
              <li><strong>{pendingContributions}</strong> contribution{pendingContributions > 1 ? "s" : ""} remain pending for this period.</li>
            )}
            {totalOutstanding > 0 && (
              <li>Outstanding loan balance of <strong>{formatAmount(totalOutstanding)}</strong> requires monitoring.</li>
            )}
            {contributions.length === 0 && savings.length === 0 && (
              <li>No financial activity recorded for this period. Consider following up with members.</li>
            )}
            {repaymentProgress > 0 && repaymentProgress < 50 && (
              <li>Loan repayment progress is at {repaymentProgress}%. Consider reviewing repayment schedules.</li>
            )}
            {pendingContributions === 0 && contributions.length > 0 && (
              <li>All contributions for this period have been settled. Excellent compliance.</li>
            )}
          </ul>
        </div>

        {/* ═══ Footer ═══ */}
        <div className="bg-[#1a2332] dark:bg-[#0f1729] text-white/50 rounded-b-xl p-6 text-xs flex items-center justify-between print:rounded-none">
          <div>
            <p>Prepared by: <span className="text-white/70">{family?.name} Financial System</span></p>
            <p className="mt-1">This report is auto-generated and reflects data as of {generatedAt}.</p>
          </div>
          <div className="text-right">
            <p>Version 1.0</p>
            <p className="mt-1">{monthLabel}</p>
          </div>
        </div>
      </main>
    </div>
  );
};

// ─── Summary Card Component ──────────────────────────────────
function SummaryCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: string }) {
  return (
    <div className="text-center space-y-1">
      <Icon className={`w-5 h-5 mx-auto ${accent}`} />
      <p className="text-lg font-bold text-[#1a2332] dark:text-foreground font-mono">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
    </div>
  );
}

export default FamilyReports;

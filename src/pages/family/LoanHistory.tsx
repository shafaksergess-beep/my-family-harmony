import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { ArrowLeft, Download, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { exportToCSV } from "@/lib/export";

interface LoanHistory {
  id: string;
  amount: number;
  interest_rate: number;
  term_months: number;
  status: string;
  purpose: string;
  amount_paid: number | null;
  interest_paid: number | null;
  created_at: string;
  approved_at: string | null;
  disbursed_at: string | null;
  due_date: string | null;
  notes: string | null;
  member_name: string;
  member_id: string;
}

export default function LoanHistory() {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { family, canManageLoans, isLoading: authLoading } = useFamilyAuth(familySlug);
  const [loans, setLoans] = useState<LoanHistory[]>([]);
  const [filteredLoans, setFilteredLoans] = useState<LoanHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterMember, setFilterMember] = useState<string>("all");

  useEffect(() => {
    if (family?.id) {
      loadLoans();
    }
  }, [family?.id]);

  useEffect(() => {
    applyFilters();
  }, [loans, filterStatus, filterMember]);

  const loadLoans = async () => {
    if (!family) return;

    try {
      setLoading(true);

      // Fetch loans with member details
      const { data: loansData, error: loansError } = await supabase
        .from("loans")
        .select("*")
        .eq("family_id", family.id)
        .order("created_at", { ascending: false });

      if (loansError) throw loansError;

      // Fetch members
      const memberIds = [...new Set(loansData?.map(l => l.member_id) || [])];
      const { data: membersData, error: membersError } = await supabase
        .from("family_members")
        .select("id, user_id")
        .in("id", memberIds);

      if (membersError) throw membersError;

      // Fetch profiles
      const userIds = membersData?.map(m => m.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Merge data
      const memberIdToUserId = new Map(membersData?.map(m => [m.id, m.user_id]) || []);
      const userIdToProfile = new Map(profilesData?.map(p => [p.id, p]) || []);

      const enrichedLoans = loansData?.map(loan => ({
        ...loan,
        member_name: userIdToProfile.get(memberIdToUserId.get(loan.member_id)!)?.full_name || "Unknown",
      })) || [];

      setLoans(enrichedLoans as any);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...loans];

    if (filterStatus !== "all") {
      filtered = filtered.filter(l => l.status === filterStatus);
    }

    if (filterMember !== "all") {
      filtered = filtered.filter(l => l.member_id === filterMember);
    }

    setFilteredLoans(filtered);
  };

  const calculateLoanDetails = (loan: LoanHistory) => {
    const totalInterest = (loan.amount * loan.interest_rate * loan.term_months) / 100;
    const totalOwed = loan.amount + totalInterest;
    const totalPaid = (loan.amount_paid || 0) + (loan.interest_paid || 0);
    const outstanding = totalOwed - totalPaid;

    return { totalInterest, totalOwed, totalPaid, outstanding };
  };

  const handleExport = () => {
    const exportData = filteredLoans.map(loan => {
      const { totalInterest, totalOwed, totalPaid, outstanding } = calculateLoanDetails(loan);
      
      return {
        'Member': loan.member_name,
        'Amount (FCFA)': loan.amount,
        'Interest Rate (%)': loan.interest_rate,
        'Term (months)': loan.term_months,
        'Total Interest (FCFA)': totalInterest,
        'Total Owed (FCFA)': totalOwed,
        'Principal Paid (FCFA)': loan.amount_paid || 0,
        'Interest Paid (FCFA)': loan.interest_paid || 0,
        'Total Paid (FCFA)': totalPaid,
        'Outstanding (FCFA)': outstanding,
        'Status': loan.status,
        'Purpose': loan.purpose,
        'Requested Date': format(new Date(loan.created_at), 'yyyy-MM-dd'),
        'Approved Date': loan.approved_at ? format(new Date(loan.approved_at), 'yyyy-MM-dd') : '-',
        'Disbursed Date': loan.disbursed_at ? format(new Date(loan.disbursed_at), 'yyyy-MM-dd') : '-',
        'Due Date': loan.due_date ? format(new Date(loan.due_date), 'yyyy-MM-dd') : '-',
      };
    });

    exportToCSV(exportData, `loan-history-${family?.slug}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast({ title: "Success", description: "Loan history exported successfully" });
  };

  const uniqueMembers = [...new Set(loans.map(l => ({ id: l.member_id, name: l.member_name })))];

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!canManageLoans) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to view loan history.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/family/${familySlug}/loans`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold">Loan History & Transactions</h1>
          </div>
          <LanguageSwitcher />
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="disbursed">Disbursed</SelectItem>
                <SelectItem value="repaid">Repaid</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterMember} onValueChange={setFilterMember}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Members</SelectItem>
                {uniqueMembers.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="ml-auto">
              <Button onClick={handleExport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Loans</div>
            <div className="text-2xl font-bold">{filteredLoans.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Disbursed</div>
            <div className="text-2xl font-bold">
              {filteredLoans.filter(l => ['disbursed', 'repaid'].includes(l.status))
                .reduce((sum, l) => sum + l.amount, 0).toLocaleString()} FCFA
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Collected</div>
            <div className="text-2xl font-bold text-green-600">
              {filteredLoans.reduce((sum, l) => sum + (l.amount_paid || 0) + (l.interest_paid || 0), 0).toLocaleString()} FCFA
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Outstanding</div>
            <div className="text-2xl font-bold text-orange-600">
              {filteredLoans.filter(l => l.status === 'disbursed')
                .reduce((sum, l) => {
                  const { outstanding } = calculateLoanDetails(l);
                  return sum + outstanding;
                }, 0).toLocaleString()} FCFA
            </div>
          </Card>
        </div>

        {/* Loan History Table */}
        <Card>
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">Detailed Loan Records</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Showing {filteredLoans.length} of {loans.length} total loans
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">Date</th>
                  <th className="text-left p-4 font-medium">Member</th>
                  <th className="text-left p-4 font-medium">Purpose</th>
                  <th className="text-right p-4 font-medium">Amount</th>
                  <th className="text-right p-4 font-medium">Owed</th>
                  <th className="text-right p-4 font-medium">Paid</th>
                  <th className="text-right p-4 font-medium">Outstanding</th>
                  <th className="text-center p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLoans.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center p-8 text-muted-foreground">
                      No loans found matching the filters
                    </td>
                  </tr>
                ) : (
                  filteredLoans.map((loan) => {
                    const { totalOwed, totalPaid, outstanding } = calculateLoanDetails(loan);
                    
                    return (
                      <tr key={loan.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <div className="text-sm">{format(new Date(loan.created_at), 'MMM dd, yyyy')}</div>
                          {loan.disbursed_at && (
                            <div className="text-xs text-muted-foreground">
                              Disbursed: {format(new Date(loan.disbursed_at), 'MMM dd')}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="font-medium">{loan.member_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {loan.interest_rate}% × {loan.term_months}mo
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm max-w-xs truncate">{loan.purpose}</div>
                        </td>
                        <td className="p-4 text-right font-mono">{loan.amount.toLocaleString()}</td>
                        <td className="p-4 text-right font-mono">{totalOwed.toLocaleString()}</td>
                        <td className="p-4 text-right font-mono text-green-600">{totalPaid.toLocaleString()}</td>
                        <td className="p-4 text-right font-mono text-orange-600">
                          {outstanding > 0 ? outstanding.toLocaleString() : '-'}
                        </td>
                        <td className="p-4 text-center">
                          <Badge
                            variant={
                              loan.status === "repaid"
                                ? "default"
                                : loan.status === "disbursed"
                                ? "secondary"
                                : loan.status === "approved"
                                ? "outline"
                                : "destructive"
                            }
                          >
                            {loan.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

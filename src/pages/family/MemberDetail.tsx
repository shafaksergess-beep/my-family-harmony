import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Download, User, DollarSign, CreditCard, PiggyBank, Calendar } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateMemberReport } from "@/lib/pdfGenerator";

const MemberDetail = () => {
  const { familySlug, memberId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<any>(null);
  const [contributions, setContributions] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [savings, setSavings] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [familySlug, memberId]);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Load member details
      const { data: memberData } = await supabase
        .from("family_members")
        .select(`
          *,
          profiles!inner (full_name, email, phone),
          families!inner (name, slug)
        `)
        .eq("id", memberId)
        .single();

      if (!memberData || memberData.families.slug !== familySlug) {
        navigate(`/family/${familySlug}`);
        return;
      }

      setMember(memberData);

      // Load contributions
      const { data: contributionsData } = await supabase
        .from("contributions")
        .select("*")
        .eq("member_id", memberId)
        .order("contribution_date", { ascending: false });

      setContributions(contributionsData || []);

      // Load loans
      const { data: loansData } = await supabase
        .from("loans")
        .select("*")
        .eq("member_id", memberId)
        .order("created_at", { ascending: false });

      setLoans(loansData || []);

      // Load savings
      const { data: savingsData } = await supabase
        .from("savings")
        .select("*")
        .eq("member_id", memberId)
        .order("month", { ascending: false });

      setSavings(savingsData || []);

      // Load attendance
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select(`
          *,
          meetings!inner (meeting_date, meeting_type)
        `)
        .eq("member_id", memberId)
        .order("created_at", { ascending: false })
        .limit(20);

      setAttendance(attendanceData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load member details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    generateMemberReport({
      memberName: member.profiles.full_name,
      familyName: member.families.name,
      contributions,
      loans,
      savings,
      attendance,
    });

    toast({
      title: "Success",
      description: "Member report exported successfully",
    });
  };

  const calculateTotals = () => {
    const totalContributions = contributions.reduce((sum, c) => sum + parseFloat(c.amount), 0);
    const totalLoans = loans.reduce((sum, l) => sum + parseFloat(l.amount), 0);
    const totalLoansPaid = loans.reduce((sum, l) => sum + parseFloat(l.amount_paid || 0), 0);
    const totalSavings = savings.reduce((sum, s) => sum + parseFloat(s.amount), 0);
    const attendanceRate = attendance.length > 0 
      ? (attendance.filter(a => a.status === 'present').length / attendance.length * 100).toFixed(1)
      : 0;

    return {
      totalContributions,
      totalLoans,
      totalLoansPaid,
      loansOutstanding: totalLoans - totalLoansPaid,
      totalSavings,
      attendanceRate,
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'approved':
      case 'present':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'pending':
      case 'late':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'overdue':
      case 'absent':
      case 'rejected':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate(`/family/${familySlug}`)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("common.back")}
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <User className="w-6 h-6" />
                  {member?.profiles.full_name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {member?.families.name} • {member?.role.replace('_', ' ')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleExportPDF}>
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contributions</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.totalContributions)}</div>
              <p className="text-xs text-muted-foreground">{contributions.length} payments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loans Outstanding</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.loansOutstanding)}</div>
              <p className="text-xs text-muted-foreground">{loans.length} total loans</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.totalSavings)}</div>
              <p className="text-xs text-muted-foreground">{savings.length} deposits</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.attendanceRate}%</div>
              <p className="text-xs text-muted-foreground">{attendance.length} meetings</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tabs */}
        <Tabs defaultValue="contributions">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="contributions">Contributions</TabsTrigger>
            <TabsTrigger value="loans">Loans</TabsTrigger>
            <TabsTrigger value="savings">Savings</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
          </TabsList>

          <TabsContent value="contributions" className="space-y-4">
            {contributions.length === 0 ? (
              <Card className="p-12 text-center">
                <DollarSign className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No contributions yet</h3>
                <p className="text-muted-foreground">This member hasn't made any contributions</p>
              </Card>
            ) : (
              contributions.map((contribution) => (
                <Card key={contribution.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className={getStatusColor(contribution.status)}>
                            {contribution.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(contribution.contribution_date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-lg font-semibold">{formatCurrency(parseFloat(contribution.amount))}</p>
                        {contribution.late_fine > 0 && (
                          <p className="text-sm text-red-500">Late Fine: {formatCurrency(parseFloat(contribution.late_fine))}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="loans" className="space-y-4">
            {loans.length === 0 ? (
              <Card className="p-12 text-center">
                <CreditCard className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No loans</h3>
                <p className="text-muted-foreground">This member hasn't taken any loans</p>
              </Card>
            ) : (
              loans.map((loan) => (
                <Card key={loan.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className={getStatusColor(loan.status)}>
                            {loan.status}
                          </Badge>
                        </div>
                        <p className="font-semibold">{loan.purpose}</p>
                        <p className="text-lg font-bold">{formatCurrency(parseFloat(loan.amount))}</p>
                        <div className="text-sm text-muted-foreground mt-2">
                          <p>Paid: {formatCurrency(parseFloat(loan.amount_paid || 0))}</p>
                          <p>Outstanding: {formatCurrency(parseFloat(loan.amount) - parseFloat(loan.amount_paid || 0))}</p>
                          <p>Interest Rate: {loan.interest_rate}%</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="savings" className="space-y-4">
            {savings.length === 0 ? (
              <Card className="p-12 text-center">
                <PiggyBank className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No savings</h3>
                <p className="text-muted-foreground">This member hasn't made any savings deposits</p>
              </Card>
            ) : (
              savings.map((saving) => (
                <Card key={saving.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(saving.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                        </p>
                        <p className="text-lg font-semibold">{formatCurrency(parseFloat(saving.amount))}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="attendance" className="space-y-4">
            {attendance.length === 0 ? (
              <Card className="p-12 text-center">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No attendance records</h3>
                <p className="text-muted-foreground">No meeting attendance recorded yet</p>
              </Card>
            ) : (
              attendance.map((record) => (
                <Card key={record.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className={getStatusColor(record.status)}>
                            {record.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(record.meetings.meeting_date).toLocaleDateString()}
                          </span>
                        </div>
                        {record.lateness_minutes > 0 && (
                          <p className="text-sm text-yellow-600">
                            Late by {record.lateness_minutes} minutes
                          </p>
                        )}
                        {record.fine_amount > 0 && (
                          <p className="text-sm text-red-500">
                            Fine: {formatCurrency(parseFloat(record.fine_amount))}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default MemberDetail;

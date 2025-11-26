import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Download, Mail, Phone, Calendar, Briefcase, Home, Shield, DollarSign, TrendingUp, PiggyBank, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface MemberData {
  id: string;
  user_id: string;
  role: string;
  house_name: string | null;
  is_house_representative: boolean | null;
  joined_at: string | null;
  profiles: {
    full_name: string;
    email: string;
    phone: string | null;
    is_working: boolean | null;
    avatar_url: string | null;
  } | null;
}

const MemberDetail = () => {
  const { familyId, memberId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<MemberData | null>(null);
  const [family, setFamily] = useState<any>(null);
  const [contributions, setContributions] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [savings, setSavings] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [familyId, memberId]);

  const loadData = async () => {
    try {
      // Load family
      const { data: familyData } = await supabase
        .from("families")
        .select("*")
        .eq("id", familyId)
        .single();
      setFamily(familyData);

      // Load member
      const { data: memberData } = await supabase
        .from("family_members")
        .select(`
          id,
          user_id,
          role,
          house_name,
          is_house_representative,
          joined_at,
          profiles!inner (full_name, email, phone, is_working, avatar_url)
        `)
        .eq("id", memberId)
        .single();
      
      setMember({
        ...memberData,
        profiles: Array.isArray(memberData.profiles) ? memberData.profiles[0] : memberData.profiles
      } as MemberData);

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
        .order("created_at", { ascending: false });
      setAttendance(attendanceData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: t("common.error"),
        description: "Failed to load member details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-600';
      case 'pending': return 'text-yellow-600';
      case 'overdue': return 'text-red-600';
      case 'present': return 'text-green-600';
      case 'absent': return 'text-red-600';
      case 'late': return 'text-yellow-600';
      default: return 'text-muted-foreground';
    }
  };

  // Calculate summary statistics
  const totalContributions = contributions.filter(c => c.status === 'paid').reduce((sum, c) => sum + Number(c.amount), 0);
  const pendingContributions = contributions.filter(c => c.status === 'pending').reduce((sum, c) => sum + Number(c.amount), 0);
  const totalLoans = loans.reduce((sum, l) => sum + Number(l.amount), 0);
  const outstandingLoans = loans.filter(l => l.status !== 'paid').reduce((sum, l) => sum + (Number(l.amount) - Number(l.amount_paid || 0)), 0);
  const totalSavings = savings.reduce((sum, s) => sum + Number(s.amount), 0);
  const attendanceRate = attendance.length > 0 
    ? (attendance.filter(a => a.status === 'present').length / attendance.length * 100).toFixed(1) 
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p>Member not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate(`/admin/families/${familyId}/members`)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Members
              </Button>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Member Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={member.profiles?.avatar_url || undefined} />
                <AvatarFallback className="text-2xl">
                  {member.profiles?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold">{member.profiles?.full_name}</h1>
                    {member.is_house_representative && (
                      <Badge variant="secondary">
                        <Home className="w-3 h-3 mr-1" />
                        House Rep
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline">
                    <Shield className="w-3 h-3 mr-1" />
                    {member.role.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  {member.profiles?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{member.profiles.email}</span>
                    </div>
                  )}
                  {member.profiles?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{member.profiles.phone}</span>
                    </div>
                  )}
                  {member.house_name && (
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-muted-foreground" />
                      <span>{member.house_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    <span>{member.profiles?.is_working ? 'Working' : 'Not Working'}</span>
                  </div>
                  {member.joined_at && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>Joined: {new Date(member.joined_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contributions</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalContributions)}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(pendingContributions)} pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding Loans</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(outstandingLoans)}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(totalLoans)} total borrowed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalSavings)}</div>
              <p className="text-xs text-muted-foreground">
                {savings.length} deposits
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attendanceRate}%</div>
              <p className="text-xs text-muted-foreground">
                {attendance.filter(a => a.status === 'present').length} of {attendance.length} meetings
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tabs */}
        <Tabs defaultValue="contributions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="contributions">Contributions</TabsTrigger>
            <TabsTrigger value="loans">Loans</TabsTrigger>
            <TabsTrigger value="savings">Savings</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
          </TabsList>

          <TabsContent value="contributions">
            <Card>
              <CardHeader>
                <CardTitle>Contribution History</CardTitle>
              </CardHeader>
              <CardContent>
                {contributions.length === 0 ? (
                  <p className="text-muted-foreground">No contributions recorded</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contributions.map((contribution) => (
                        <TableRow key={contribution.id}>
                          <TableCell>{new Date(contribution.contribution_date).toLocaleDateString()}</TableCell>
                          <TableCell className="capitalize">{contribution.type}</TableCell>
                          <TableCell>{formatCurrency(contribution.amount)}</TableCell>
                          <TableCell>
                            <Badge variant={contribution.status === 'paid' ? 'default' : 'secondary'}>
                              {contribution.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {contribution.payment_date 
                              ? new Date(contribution.payment_date).toLocaleDateString() 
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="loans">
            <Card>
              <CardHeader>
                <CardTitle>Loan History</CardTitle>
              </CardHeader>
              <CardContent>
                {loans.length === 0 ? (
                  <p className="text-muted-foreground">No loans recorded</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Interest Rate</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loans.map((loan) => (
                        <TableRow key={loan.id}>
                          <TableCell>{new Date(loan.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>{formatCurrency(loan.amount)}</TableCell>
                          <TableCell>{loan.interest_rate}%</TableCell>
                          <TableCell>{formatCurrency(loan.amount_paid || 0)}</TableCell>
                          <TableCell>
                            <Badge variant={loan.status === 'paid' ? 'default' : 'secondary'}>
                              {loan.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {loan.due_date ? new Date(loan.due_date).toLocaleDateString() : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="savings">
            <Card>
              <CardHeader>
                <CardTitle>Savings History</CardTitle>
              </CardHeader>
              <CardContent>
                {savings.length === 0 ? (
                  <p className="text-muted-foreground">No savings recorded</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {savings.map((saving) => (
                        <TableRow key={saving.id}>
                          <TableCell>{new Date(saving.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</TableCell>
                          <TableCell>{formatCurrency(saving.amount)}</TableCell>
                          <TableCell>{saving.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance">
            <Card>
              <CardHeader>
                <CardTitle>Attendance History</CardTitle>
              </CardHeader>
              <CardContent>
                {attendance.length === 0 ? (
                  <p className="text-muted-foreground">No attendance records</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Meeting Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Check-in Time</TableHead>
                        <TableHead>Fine</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendance.map((record: any) => (
                        <TableRow key={record.id}>
                          <TableCell>{new Date(record.meetings.meeting_date).toLocaleDateString()}</TableCell>
                          <TableCell className="capitalize">{record.meetings.meeting_type}</TableCell>
                          <TableCell>
                            <Badge variant={record.status === 'present' ? 'default' : 'secondary'}>
                              {record.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {record.check_in_time 
                              ? new Date(record.check_in_time).toLocaleTimeString() 
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {record.fine_amount ? formatCurrency(record.fine_amount) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default MemberDetail;

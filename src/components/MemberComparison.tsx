import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, CreditCard, PiggyBank, TrendingUp, ArrowUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

interface MemberData {
  id: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
  role: string;
  house_name: string | null;
}

interface MemberStats {
  memberId: string;
  name: string;
  role: string;
  house: string;
  totalContributions: number;
  pendingContributions: number;
  totalLoans: number;
  outstandingLoans: number;
  totalSavings: number;
  attendanceRate: number;
  attendanceCount: number;
}

interface MemberComparisonProps {
  familyId: string;
  members: any[];
}

export const MemberComparison = ({ familyId, members }: MemberComparisonProps) => {
  const [open, setOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [comparisonData, setComparisonData] = useState<MemberStats[]>([]);
  const { toast } = useToast();

  const toggleMemberSelection = (memberId: string) => {
    const newSelection = new Set(selectedMembers);
    if (newSelection.has(memberId)) {
      newSelection.delete(memberId);
    } else {
      if (newSelection.size >= 5) {
        toast({
          title: "Limit Reached",
          description: "You can compare up to 5 members at once",
          variant: "destructive",
        });
        return;
      }
      newSelection.add(memberId);
    }
    setSelectedMembers(newSelection);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const loadComparisonData = async () => {
    if (selectedMembers.size < 2) {
      toast({
        title: "Select Members",
        description: "Please select at least 2 members to compare",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const memberIds = Array.from(selectedMembers);
      const stats: MemberStats[] = [];

      for (const memberId of memberIds) {
        const member = members.find(m => m.id === memberId);
        
        // Load contributions
        const { data: contributions } = await supabase
          .from("contributions")
          .select("*")
          .eq("member_id", memberId);

        // Load loans
        const { data: loans } = await supabase
          .from("loans")
          .select("*")
          .eq("member_id", memberId);

        // Load savings
        const { data: savings } = await supabase
          .from("savings")
          .select("*")
          .eq("member_id", memberId);

        // Load attendance
        const { data: attendance } = await supabase
          .from("attendance")
          .select("*")
          .eq("member_id", memberId);

        const totalContributions = (contributions || [])
          .filter(c => c.status === 'paid')
          .reduce((sum, c) => sum + Number(c.amount), 0);

        const pendingContributions = (contributions || [])
          .filter(c => c.status === 'pending')
          .reduce((sum, c) => sum + Number(c.amount), 0);

        const totalLoans = (loans || []).reduce((sum, l) => sum + Number(l.amount), 0);
        
        const outstandingLoans = (loans || [])
          .filter(l => l.status !== 'paid')
          .reduce((sum, l) => sum + (Number(l.amount) - Number(l.amount_paid || 0)), 0);

        const totalSavings = (savings || []).reduce((sum, s) => sum + Number(s.amount), 0);

        const attendanceRate = (attendance || []).length > 0
          ? ((attendance || []).filter(a => a.status === 'present').length / (attendance || []).length * 100)
          : 0;

        stats.push({
          memberId,
          name: member?.profiles?.full_name || 'Unknown',
          role: member?.role || 'member',
          house: member?.house_name || 'N/A',
          totalContributions,
          pendingContributions,
          totalLoans,
          outstandingLoans,
          totalSavings,
          attendanceRate,
          attendanceCount: (attendance || []).length,
        });
      }

      setComparisonData(stats);
    } catch (error) {
      console.error("Error loading comparison data:", error);
      toast({
        title: "Error",
        description: "Failed to load comparison data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getHighlightClass = (values: number[], currentValue: number, higherIsBetter: boolean = true) => {
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    if (values.length === 1) return '';
    
    if (higherIsBetter) {
      if (currentValue === max) return 'bg-green-100 dark:bg-green-900/20 font-semibold';
      if (currentValue === min) return 'bg-red-100 dark:bg-red-900/20';
    } else {
      if (currentValue === min) return 'bg-green-100 dark:bg-green-900/20 font-semibold';
      if (currentValue === max) return 'bg-red-100 dark:bg-red-900/20';
    }
    
    return '';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Users className="w-4 h-4 mr-2" />
          Compare Members
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Member Comparison</DialogTitle>
          <DialogDescription>
            Select 2-5 members to compare their financial metrics and attendance
          </DialogDescription>
        </DialogHeader>

        {comparisonData.length === 0 ? (
          <div className="space-y-4">
            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>House</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedMembers.has(member.id)}
                          onCheckedChange={() => toggleMemberSelection(member.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {member.profiles?.full_name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{member.role}</Badge>
                      </TableCell>
                      <TableCell>{member.house_name || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {selectedMembers.size} member{selectedMembers.size !== 1 ? 's' : ''} selected
              </p>
              <Button 
                onClick={loadComparisonData} 
                disabled={selectedMembers.size < 2 || loading}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Compare Selected
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Comparison Results</h3>
              <Button variant="outline" onClick={() => setComparisonData([])}>
                New Comparison
              </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Contributions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Total paid across members</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(comparisonData.reduce((sum, m) => sum + m.totalContributions, 0))}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Outstanding Loans
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Total outstanding</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(comparisonData.reduce((sum, m) => sum + m.outstandingLoans, 0))}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <PiggyBank className="w-4 h-4" />
                    Total Savings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Combined savings</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(comparisonData.reduce((sum, m) => sum + m.totalSavings, 0))}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Avg Attendance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Average rate</p>
                  <p className="text-lg font-bold">
                    {(comparisonData.reduce((sum, m) => sum + m.attendanceRate, 0) / comparisonData.length).toFixed(1)}%
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Comparison Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    {comparisonData.map((member) => (
                      <TableHead key={member.memberId} className="text-center">
                        <div className="font-semibold">{member.name}</div>
                        <Badge variant="outline" className="mt-1 text-xs">{member.role}</Badge>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">House</TableCell>
                    {comparisonData.map((member) => (
                      <TableCell key={member.memberId} className="text-center">
                        {member.house}
                      </TableCell>
                    ))}
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-medium">Total Contributions</TableCell>
                    {comparisonData.map((member) => (
                      <TableCell 
                        key={member.memberId} 
                        className={`text-center ${getHighlightClass(
                          comparisonData.map(m => m.totalContributions),
                          member.totalContributions
                        )}`}
                      >
                        {formatCurrency(member.totalContributions)}
                      </TableCell>
                    ))}
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-medium">Pending Contributions</TableCell>
                    {comparisonData.map((member) => (
                      <TableCell 
                        key={member.memberId} 
                        className={`text-center ${getHighlightClass(
                          comparisonData.map(m => m.pendingContributions),
                          member.pendingContributions,
                          false
                        )}`}
                      >
                        {formatCurrency(member.pendingContributions)}
                      </TableCell>
                    ))}
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-medium">Total Loans Taken</TableCell>
                    {comparisonData.map((member) => (
                      <TableCell key={member.memberId} className="text-center">
                        {formatCurrency(member.totalLoans)}
                      </TableCell>
                    ))}
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-medium">Outstanding Loans</TableCell>
                    {comparisonData.map((member) => (
                      <TableCell 
                        key={member.memberId} 
                        className={`text-center ${getHighlightClass(
                          comparisonData.map(m => m.outstandingLoans),
                          member.outstandingLoans,
                          false
                        )}`}
                      >
                        {formatCurrency(member.outstandingLoans)}
                      </TableCell>
                    ))}
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-medium">Total Savings</TableCell>
                    {comparisonData.map((member) => (
                      <TableCell 
                        key={member.memberId} 
                        className={`text-center ${getHighlightClass(
                          comparisonData.map(m => m.totalSavings),
                          member.totalSavings
                        )}`}
                      >
                        {formatCurrency(member.totalSavings)}
                      </TableCell>
                    ))}
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-medium">Attendance Rate</TableCell>
                    {comparisonData.map((member) => (
                      <TableCell 
                        key={member.memberId} 
                        className={`text-center ${getHighlightClass(
                          comparisonData.map(m => m.attendanceRate),
                          member.attendanceRate
                        )}`}
                      >
                        {member.attendanceRate.toFixed(1)}%
                        <div className="text-xs text-muted-foreground">
                          ({member.attendanceCount} meetings)
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Visual Charts */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Financial Comparison Chart</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={comparisonData.map(m => ({
                      name: m.name.split(' ')[0], // First name only
                      Contributions: m.totalContributions,
                      Savings: m.totalSavings,
                      Outstanding: m.outstandingLoans,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      <Bar dataKey="Contributions" fill="hsl(var(--primary))" />
                      <Bar dataKey="Savings" fill="hsl(var(--chart-2))" />
                      <Bar dataKey="Outstanding" fill="hsl(var(--destructive))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Radar</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={[
                      {
                        metric: 'Contributions',
                        ...Object.fromEntries(comparisonData.map(m => [
                          m.name.split(' ')[0],
                          m.totalContributions / Math.max(...comparisonData.map(x => x.totalContributions)) * 100
                        ]))
                      },
                      {
                        metric: 'Savings',
                        ...Object.fromEntries(comparisonData.map(m => [
                          m.name.split(' ')[0],
                          m.totalSavings / Math.max(...comparisonData.map(x => x.totalSavings)) * 100
                        ]))
                      },
                      {
                        metric: 'Attendance',
                        ...Object.fromEntries(comparisonData.map(m => [
                          m.name.split(' ')[0],
                          m.attendanceRate
                        ]))
                      },
                      {
                        metric: 'Loan Compliance',
                        ...Object.fromEntries(comparisonData.map(m => [
                          m.name.split(' ')[0],
                          m.totalLoans > 0 ? ((m.totalLoans - m.outstandingLoans) / m.totalLoans * 100) : 100
                        ]))
                      },
                    ]}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      {comparisonData.map((member, index) => (
                        <Radar
                          key={member.memberId}
                          name={member.name.split(' ')[0]}
                          dataKey={member.name.split(' ')[0]}
                          stroke={`hsl(${(index * 360) / comparisonData.length}, 70%, 50%)`}
                          fill={`hsl(${(index * 360) / comparisonData.length}, 70%, 50%)`}
                          fillOpacity={0.3}
                        />
                      ))}
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowUpDown className="w-4 h-4" />
              <span>Green highlight = Best performer | Red highlight = Needs attention</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

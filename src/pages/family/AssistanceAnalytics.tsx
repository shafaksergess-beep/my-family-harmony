import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { ArrowLeft, Loader2, TrendingUp, Users, DollarSign, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AssistanceEvent {
  id: string;
  event_type: string;
  event_date: string;
  amount: number;
  is_paid: boolean;
  member_id: string;
  family_members: {
    profiles: {
      full_name: string;
    };
  };
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  birth: "Birth",
  member_death: "Member Death",
  spouse_death: "Spouse Death",
  child_death: "Child Death",
  external_wonya: "External Wonya Kotto",
  external_other: "External Other",
  sickness: "Sickness",
  wedding: "Wedding",
  ceremony_invitation: "Other Ceremony",
};

const COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#a855f7', '#14b8a6'];

export default function AssistanceAnalytics() {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { family, isLoading: authLoading } = useFamilyAuth(familySlug);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<AssistanceEvent[]>([]);
  const [budget, setBudget] = useState({ allocated: 5000000, spent: 0 });

  useEffect(() => {
    if (family?.id) {
      loadData();
    }
  }, [family?.id]);

  const loadData = async () => {
    if (!family) return;
    
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("assistance_events")
        .select(`
          *,
          family_members!inner(
            profiles(full_name)
          )
        `)
        .eq("family_id", family.id)
        .order("event_date", { ascending: false });

      if (error) throw error;
      setEvents(data || []);

      // Calculate spent amount
      const spent = (data || []).reduce((sum, e) => sum + (e.is_paid ? e.amount : 0), 0);
      setBudget(prev => ({ ...prev, spent }));
    } catch (error) {
      console.error("Error loading assistance data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Event type breakdown
  const eventTypeData = Object.entries(
    events.reduce((acc, event) => {
      const type = event.event_type;
      if (!acc[type]) acc[type] = { count: 0, total: 0 };
      acc[type].count++;
      acc[type].total += event.amount;
      return acc;
    }, {} as Record<string, { count: number; total: number }>)
  ).map(([type, data]) => ({
    name: EVENT_TYPE_LABELS[type] || type,
    count: data.count,
    amount: data.total,
  }));

  // Monthly trends
  const monthlyData = events.reduce((acc, event) => {
    const month = new Date(event.event_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    if (!acc[month]) acc[month] = { month, count: 0, amount: 0 };
    acc[month].count++;
    acc[month].amount += event.amount;
    return acc;
  }, {} as Record<string, { month: string; count: number; amount: number }>);

  const monthlyTrends = Object.values(monthlyData).reverse().slice(0, 12);

  // Member-level statistics
  const memberStats = Object.entries(
    events.reduce((acc, event) => {
      const name = event.family_members.profiles.full_name;
      if (!acc[name]) acc[name] = { name, count: 0, total: 0 };
      acc[name].count++;
      acc[name].total += event.amount;
      return acc;
    }, {} as Record<string, { name: string; count: number; total: number }>)
  ).map(([_, data]) => data).sort((a, b) => b.total - a.total);

  // Payment status
  const paidCount = events.filter(e => e.is_paid).length;
  const pendingCount = events.length - paidCount;
  const paidAmount = events.filter(e => e.is_paid).reduce((sum, e) => sum + e.amount, 0);
  const pendingAmount = events.filter(e => !e.is_paid).reduce((sum, e) => sum + e.amount, 0);

  const paymentStatusData = [
    { name: "Paid", value: paidCount, amount: paidAmount },
    { name: "Pending", value: pendingCount, amount: pendingAmount },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(`/family/${familySlug}`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Assistance Analytics</h1>
              <p className="text-sm text-muted-foreground">Track assistance trends and budget</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{events.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{paidAmount.toLocaleString()} FCFA</div>
              <p className="text-xs text-muted-foreground">Paid assistance</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Budget Remaining</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(budget.allocated - budget.spent).toLocaleString()} FCFA</div>
              <p className="text-xs text-muted-foreground">
                {((budget.spent / budget.allocated) * 100).toFixed(1)}% used
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingAmount.toLocaleString()} FCFA</div>
              <p className="text-xs text-muted-foreground">{pendingCount} pending events</p>
            </CardContent>
          </Card>
        </div>

        {/* Budget Monitor */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Monitor</CardTitle>
            <CardDescription>Annual assistance budget tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Allocated Budget:</span>
                <span className="font-semibold">{budget.allocated.toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Spent (Paid):</span>
                <span className="font-semibold text-red-600">{budget.spent.toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Pending:</span>
                <span className="font-semibold text-orange-600">{pendingAmount.toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Remaining:</span>
                <span className="font-semibold text-green-600">{(budget.allocated - budget.spent).toLocaleString()} FCFA</span>
              </div>
              <div className="w-full bg-muted rounded-full h-4">
                <div 
                  className="bg-primary h-4 rounded-full transition-all"
                  style={{ width: `${Math.min((budget.spent / budget.allocated) * 100, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="breakdown" className="space-y-4">
          <TabsList>
            <TabsTrigger value="breakdown">Event Type Breakdown</TabsTrigger>
            <TabsTrigger value="trends">Monthly Trends</TabsTrigger>
            <TabsTrigger value="members">Member Statistics</TabsTrigger>
            <TabsTrigger value="status">Payment Status</TabsTrigger>
          </TabsList>

          <TabsContent value="breakdown" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Assistance by Event Type</CardTitle>
                <CardDescription>Distribution of assistance events and amounts</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={eventTypeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="count" fill="#8b5cf6" name="Event Count" />
                    <Bar yAxisId="right" dataKey="amount" fill="#ec4899" name="Total Amount (FCFA)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Assistance Trends</CardTitle>
                <CardDescription>Events and spending over the last 12 months</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="count" stroke="#8b5cf6" name="Event Count" />
                    <Line yAxisId="right" type="monotone" dataKey="amount" stroke="#ec4899" name="Total Amount (FCFA)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Member-Level Statistics</CardTitle>
                <CardDescription>Assistance received by family members</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {memberStats.map((stat, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-semibold">{stat.name}</p>
                        <p className="text-sm text-muted-foreground">{stat.count} event{stat.count !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{stat.total.toLocaleString()} FCFA</p>
                      </div>
                    </div>
                  ))}
                  {memberStats.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No assistance events recorded</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="status" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment Status Distribution</CardTitle>
                <CardDescription>Paid vs pending assistance events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={paymentStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, amount }) => `${name}: ${value} (${amount.toLocaleString()} FCFA)`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {paymentStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

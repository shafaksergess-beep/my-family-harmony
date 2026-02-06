import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, TrendingUp } from 'lucide-react';
import { format, startOfMonth, subMonths } from 'date-fns';

interface SavingsGrowthChartProps {
  familyId: string;
}

interface ChartDataPoint {
  month: string;
  savings: number;
  cumulative: number;
}

export function SavingsGrowthChart({ familyId }: SavingsGrowthChartProps) {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [familyId]);

  const loadData = async () => {
    try {
      // Get savings contributions for the last 12 months
      const startDate = format(subMonths(new Date(), 11), 'yyyy-MM-01');

      const { data: savings, error } = await supabase
        .from('contributions')
        .select('amount, contribution_date')
        .eq('family_id', familyId)
        .eq('type', 'savings')
        .eq('status', 'paid')
        .gte('contribution_date', startDate)
        .order('contribution_date', { ascending: true });

      if (error) throw error;

      // Group by month
      const monthlyData = new Map<string, number>();
      
      // Initialize all months
      for (let i = 11; i >= 0; i--) {
        const monthKey = format(subMonths(new Date(), i), 'MMM yyyy');
        monthlyData.set(monthKey, 0);
      }

      // Aggregate savings
      savings?.forEach(s => {
        const monthKey = format(new Date(s.contribution_date), 'MMM yyyy');
        const current = monthlyData.get(monthKey) || 0;
        monthlyData.set(monthKey, current + Number(s.amount));
      });

      // Calculate cumulative
      let cumulative = 0;
      const chartData: ChartDataPoint[] = Array.from(monthlyData.entries()).map(([month, savings]) => {
        cumulative += savings;
        return { month, savings, cumulative };
      });

      setData(chartData);
    } catch (error) {
      console.error('Error loading savings data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[300px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => 
    `${(value / 1000).toFixed(0)}K`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-600" />
          Family Savings Growth
        </CardTitle>
        <CardDescription>Monthly savings and cumulative total over the past year</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => value.split(' ')[0]}
              />
              <YAxis 
                tickFormatter={formatCurrency}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toLocaleString()} FCFA`, '']}
                labelStyle={{ fontWeight: 'bold' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="savings" 
                name="Monthly Savings"
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
              />
              <Line 
                type="monotone" 
                dataKey="cumulative" 
                name="Cumulative Total"
                stroke="hsl(142, 76%, 36%)" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

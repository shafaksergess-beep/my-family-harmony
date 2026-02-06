import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, BarChart3 } from 'lucide-react';
import { format, subMonths } from 'date-fns';

interface ContributionTrendsChartProps {
  familyId: string;
}

interface ChartDataPoint {
  month: string;
  monthly: number;
  special: number;
  fines: number;
  total: number;
}

export function ContributionTrendsChart({ familyId }: ContributionTrendsChartProps) {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [familyId]);

  const loadData = async () => {
    try {
      // Get contributions for the last 12 months
      const startDate = format(subMonths(new Date(), 11), 'yyyy-MM-01');

      const { data: contributions, error } = await supabase
        .from('contributions')
        .select('amount, contribution_date, type')
        .eq('family_id', familyId)
        .eq('status', 'paid')
        .neq('type', 'savings') // Exclude savings, shown in separate chart
        .gte('contribution_date', startDate)
        .order('contribution_date', { ascending: true });

      if (error) throw error;

      // Initialize monthly buckets
      const monthlyData = new Map<string, { monthly: number; special: number; fines: number }>();
      
      for (let i = 11; i >= 0; i--) {
        const monthKey = format(subMonths(new Date(), i), 'MMM yyyy');
        monthlyData.set(monthKey, { monthly: 0, special: 0, fines: 0 });
      }

      // Aggregate by type
      contributions?.forEach(c => {
        const monthKey = format(new Date(c.contribution_date), 'MMM yyyy');
        const current = monthlyData.get(monthKey);
        if (current) {
          const amount = Number(c.amount);
          switch (c.type) {
            case 'monthly':
              current.monthly += amount;
              break;
            case 'special':
              current.special += amount;
              break;
            case 'fine':
              current.fines += amount;
              break;
            default:
              current.monthly += amount;
          }
        }
      });

      // Build chart data
      const chartData: ChartDataPoint[] = Array.from(monthlyData.entries()).map(([month, values]) => ({
        month,
        ...values,
        total: values.monthly + values.special + values.fines,
      }));

      setData(chartData);
    } catch (error) {
      console.error('Error loading contribution trends:', error);
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

  const totalContributions = data.reduce((sum, d) => sum + d.total, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              Contribution Trends
            </CardTitle>
            <CardDescription>Monthly contribution patterns by type</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">12-Month Total</p>
            <p className="text-lg font-bold text-primary">
              {totalContributions.toLocaleString()} FCFA
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorMonthly" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorSpecial" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorFines" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
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
                formatter={(value: number, name: string) => [
                  `${value.toLocaleString()} FCFA`, 
                  name.charAt(0).toUpperCase() + name.slice(1)
                ]}
                labelStyle={{ fontWeight: 'bold' }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="monthly" 
                name="Monthly"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorMonthly)"
                stackId="1"
              />
              <Area 
                type="monotone" 
                dataKey="special" 
                name="Special"
                stroke="hsl(262, 83%, 58%)"
                fillOpacity={1}
                fill="url(#colorSpecial)"
                stackId="1"
              />
              <Area 
                type="monotone" 
                dataKey="fines" 
                name="Fines"
                stroke="hsl(0, 84%, 60%)"
                fillOpacity={1}
                fill="url(#colorFines)"
                stackId="1"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

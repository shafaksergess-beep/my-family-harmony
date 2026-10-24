import { useTranslation } from "react-i18next";
import { useDevice } from "@/hooks/useDevice";
import { useCurrency } from "@/context/CurrencyContext";
import { MobileChart } from "./MobileAnalytics";
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CreditCard } from 'lucide-react';
import { format, subMonths } from 'date-fns';

interface LoanRepaymentChartProps {
  familyId: string;
}

interface ChartDataPoint {
  month: string;
  repaid: number;
  outstanding: number;
}

export function LoanRepaymentChart({ familyId }: LoanRepaymentChartProps) {
  const { t } = useTranslation(); const { isMobile } = useDevice(); const { formatAmount } = useCurrency();
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalOutstanding, setTotalOutstanding] = useState(0);

  useEffect(() => {
    loadData();
  }, [familyId]);

  const loadData = async () => {
    try {
      // Get loan payments for the last 12 months
      const startDate = format(subMonths(new Date(), 11), 'yyyy-MM-01');

      const { data: payments, error: paymentsError } = await supabase
        .from('loan_payments')
        .select('amount_paid, payment_date')
        .eq('family_id', familyId)
        .gte('payment_date', startDate)
        .order('payment_date', { ascending: true });

      if (paymentsError) throw paymentsError;

      // Get current outstanding loans
      const { data: loans, error: loansError } = await supabase
        .from('loans')
        .select('amount, amount_paid')
        .eq('family_id', familyId)
        .in('status', ['approved', 'active']);

      if (loansError) throw loansError;

      const outstanding = loans?.reduce((sum, loan) => {
        return sum + (Number(loan.amount) - Number(loan.amount_paid || 0));
      }, 0) || 0;
      
      setTotalOutstanding(outstanding);

      // Group payments by month
      const monthlyData = new Map<string, number>();
      
      // Initialize all months
      for (let i = 11; i >= 0; i--) {
        const monthKey = format(subMonths(new Date(), i), 'MMM yyyy');
        monthlyData.set(monthKey, 0);
      }

      // Aggregate payments
      payments?.forEach(p => {
        const monthKey = format(new Date(p.payment_date), 'MMM yyyy');
        const current = monthlyData.get(monthKey) || 0;
        monthlyData.set(monthKey, current + Number(p.amount_paid));
      });

      // Build chart data
      const chartData: ChartDataPoint[] = Array.from(monthlyData.entries()).map(([month, repaid]) => ({
        month,
        repaid,
        outstanding: 0, // We'll show this as a summary stat instead
      }));

      setData(chartData);
    } catch (error) {
      console.error('Error loading loan repayment data:', error);
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

  const totalRepaid = data.reduce((sum, d) => sum + d.repaid, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-orange-600" />
              {t("phase2.repaymentHistory")}
            </CardTitle>
            <CardDescription>{t("phase2.repaymentDescription")}</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{t("phase2.outstanding")}</p>
            <p className="text-lg font-bold text-orange-600">
              {formatAmount(totalOutstanding)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={isMobile ? "min-w-0" : "h-[300px]"}>
          <MobileChart><ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                formatter={(value: number) => [`${formatAmount(value)}`, t('phase2.amountRepaid')]}
                labelStyle={{ fontWeight: 'bold' }}
              />
              <Legend />
              <Bar 
                dataKey="repaid" 
                name={t("phase2.amountRepaid")}
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer></MobileChart>
        </div>
        <div className="mt-4 flex justify-center gap-8 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-primary" />
            <span className="text-muted-foreground">
              {t("phase2.totalRepaid")} <span className="font-medium text-foreground">{formatAmount(totalRepaid)}</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

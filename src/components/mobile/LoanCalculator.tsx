import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Calculator, TrendingUp, Calendar, Percent } from "lucide-react";

interface LoanCalculatorProps {
  minAmount: number;
  maxAmount: number;
  interestRate: number;
  onCalculate?: (values: {
    amount: number;
    termMonths: number;
    totalInterest: number;
    totalRepayment: number;
    monthlyPayment: number;
  }) => void;
}

export function LoanCalculator({
  minAmount = 50000,
  maxAmount = 5000000,
  interestRate = 2.5,
  onCalculate,
}: LoanCalculatorProps) {
  const [amount, setAmount] = useState(minAmount);
  const [termMonths, setTermMonths] = useState(4);

  const totalInterest = (amount * interestRate * termMonths) / 100;
  const totalRepayment = amount + totalInterest;
  const monthlyPayment = totalRepayment / termMonths;

  useEffect(() => {
    onCalculate?.({
      amount,
      termMonths,
      totalInterest,
      totalRepayment,
      monthlyPayment,
    });
  }, [amount, termMonths, totalInterest, totalRepayment, monthlyPayment, onCalculate]);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Loan Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Amount Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Loan Amount</Label>
            <span className="text-lg font-bold text-primary">
              {amount.toLocaleString()} FCFA
            </span>
          </div>
          <Slider
            value={[amount]}
            onValueChange={([val]) => setAmount(val)}
            min={minAmount}
            max={maxAmount}
            step={10000}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{minAmount.toLocaleString()}</span>
            <span>{maxAmount.toLocaleString()}</span>
          </div>
        </div>

        {/* Term Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Repayment Term</Label>
            <span className="text-lg font-bold text-primary">
              {termMonths} month{termMonths > 1 ? "s" : ""}
            </span>
          </div>
          <Slider
            value={[termMonths]}
            onValueChange={([val]) => setTermMonths(val)}
            min={1}
            max={12}
            step={1}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 month</span>
            <span>12 months</span>
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Percent className="h-3 w-3" />
              Interest Rate
            </div>
            <div className="font-semibold">{interestRate}%/month</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              Total Interest
            </div>
            <div className="font-semibold text-orange-600">
              {totalInterest.toLocaleString()} FCFA
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Monthly Payment
            </div>
            <div className="font-semibold">
              {Math.ceil(monthlyPayment).toLocaleString()} FCFA
            </div>
          </div>
          <div className="bg-primary/10 rounded-lg p-3 space-y-1">
            <div className="text-xs text-muted-foreground">Total Repayment</div>
            <div className="font-bold text-primary">
              {totalRepayment.toLocaleString()} FCFA
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

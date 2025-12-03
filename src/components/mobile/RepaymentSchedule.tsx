import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { format, addMonths, isPast, isThisMonth } from "date-fns";

interface Payment {
  month: number;
  date: Date;
  principal: number;
  interest: number;
  total: number;
  status: "paid" | "current" | "upcoming" | "overdue";
}

interface RepaymentScheduleProps {
  loanAmount: number;
  interestRate: number;
  termMonths: number;
  startDate?: Date;
  amountPaid?: number;
  interestPaid?: number;
}

export function RepaymentSchedule({
  loanAmount,
  interestRate,
  termMonths,
  startDate = new Date(),
  amountPaid = 0,
  interestPaid = 0,
}: RepaymentScheduleProps) {
  const totalInterest = (loanAmount * interestRate * termMonths) / 100;
  const totalAmount = loanAmount + totalInterest;
  const monthlyPrincipal = loanAmount / termMonths;
  const monthlyInterest = totalInterest / termMonths;
  const monthlyTotal = totalAmount / termMonths;

  // Calculate how many months have been paid
  const totalPaid = amountPaid + interestPaid;
  const monthsPaid = Math.floor(totalPaid / monthlyTotal);

  // Generate payment schedule
  const schedule: Payment[] = Array.from({ length: termMonths }, (_, i) => {
    const paymentDate = addMonths(startDate, i + 1);
    let status: Payment["status"] = "upcoming";

    if (i < monthsPaid) {
      status = "paid";
    } else if (i === monthsPaid) {
      if (isPast(paymentDate) && !isThisMonth(paymentDate)) {
        status = "overdue";
      } else {
        status = "current";
      }
    }

    return {
      month: i + 1,
      date: paymentDate,
      principal: monthlyPrincipal,
      interest: monthlyInterest,
      total: monthlyTotal,
      status,
    };
  });

  const getStatusBadge = (status: Payment["status"]) => {
    switch (status) {
      case "paid":
        return (
          <Badge variant="default" className="bg-green-500 text-white">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Paid
          </Badge>
        );
      case "current":
        return (
          <Badge variant="secondary" className="bg-blue-500 text-white">
            <Clock className="h-3 w-3 mr-1" />
            Due
          </Badge>
        );
      case "overdue":
        return (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Overdue
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <CalendarDays className="h-3 w-3 mr-1" />
            Upcoming
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          Repayment Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Summary */}
        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg mb-4">
          <div>
            <div className="text-sm text-muted-foreground">Progress</div>
            <div className="font-semibold">
              {monthsPaid}/{termMonths} payments
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Remaining</div>
            <div className="font-semibold text-primary">
              {(totalAmount - totalPaid).toLocaleString()} FCFA
            </div>
          </div>
        </div>

        {/* Schedule List */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {schedule.map((payment) => (
            <div
              key={payment.month}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                payment.status === "current"
                  ? "border-blue-500 bg-blue-500/5"
                  : payment.status === "overdue"
                  ? "border-red-500 bg-red-500/5"
                  : payment.status === "paid"
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-border"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                  {payment.month}
                </div>
                <div>
                  <div className="font-medium text-sm">
                    {format(payment.date, "MMM dd, yyyy")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    P: {Math.ceil(payment.principal).toLocaleString()} + I:{" "}
                    {Math.ceil(payment.interest).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-sm">
                  {Math.ceil(payment.total).toLocaleString()}
                </div>
                {getStatusBadge(payment.status)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

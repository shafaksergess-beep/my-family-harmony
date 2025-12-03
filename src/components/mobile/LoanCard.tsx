import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Banknote,
} from "lucide-react";
import { format } from "date-fns";

interface Loan {
  id: string;
  amount: number;
  interest_rate: number;
  term_months: number;
  status: string;
  purpose: string;
  amount_paid: number | null;
  interest_paid: number | null;
  approved_at: string | null;
  disbursed_at: string | null;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  member_name?: string;
}

interface LoanCardProps {
  loan: Loan;
  onMakePayment?: (loan: Loan) => void;
  onViewDetails?: (loan: Loan) => void;
  showMemberName?: boolean;
}

export function LoanCard({
  loan,
  onMakePayment,
  onViewDetails,
  showMemberName = false,
}: LoanCardProps) {
  const totalInterest = (loan.amount * loan.interest_rate * loan.term_months) / 100;
  const totalOwed = loan.amount + totalInterest;
  const totalPaid = (loan.amount_paid || 0) + (loan.interest_paid || 0);
  const remaining = totalOwed - totalPaid;
  const progress = (totalPaid / totalOwed) * 100;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return {
          label: "Pending",
          variant: "outline" as const,
          icon: Clock,
          color: "text-yellow-600",
        };
      case "approved":
        return {
          label: "Approved",
          variant: "secondary" as const,
          icon: CheckCircle2,
          color: "text-blue-600",
        };
      case "disbursed":
        return {
          label: "Active",
          variant: "default" as const,
          icon: Banknote,
          color: "text-green-600",
        };
      case "repaid":
        return {
          label: "Repaid",
          variant: "default" as const,
          icon: CheckCircle2,
          color: "text-green-600",
        };
      case "rejected":
        return {
          label: "Rejected",
          variant: "destructive" as const,
          icon: XCircle,
          color: "text-red-600",
        };
      default:
        return {
          label: status,
          variant: "outline" as const,
          icon: Clock,
          color: "text-muted-foreground",
        };
    }
  };

  const statusConfig = getStatusConfig(loan.status);
  const StatusIcon = statusConfig.icon;

  const isOverdue = loan.due_date && new Date(loan.due_date) < new Date() && loan.status === "disbursed";

  return (
    <Card
      className={`overflow-hidden transition-all active:scale-[0.98] ${
        isOverdue ? "border-red-500/50" : ""
      }`}
      onClick={() => onViewDetails?.(loan)}
    >
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            {showMemberName && loan.member_name && (
              <div className="text-sm text-muted-foreground">{loan.member_name}</div>
            )}
            <div className="text-xl font-bold">{loan.amount.toLocaleString()} FCFA</div>
            <div className="text-sm text-muted-foreground line-clamp-1">
              {loan.purpose}
            </div>
          </div>
          <Badge variant={statusConfig.variant} className="flex items-center gap-1">
            <StatusIcon className="h-3 w-3" />
            {statusConfig.label}
          </Badge>
        </div>

        {/* Overdue Warning */}
        {isOverdue && (
          <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded-lg text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Payment overdue</span>
          </div>
        )}

        {/* Progress for active loans */}
        {loan.status === "disbursed" && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Repayment Progress</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Paid: {totalPaid.toLocaleString()}</span>
              <span>Remaining: {remaining.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="text-xs text-muted-foreground">Interest</div>
            <div className="font-semibold text-sm">{loan.interest_rate}%</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="text-xs text-muted-foreground">Term</div>
            <div className="font-semibold text-sm">{loan.term_months}mo</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="font-semibold text-sm">{totalOwed.toLocaleString()}</div>
          </div>
        </div>

        {/* Dates */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(loan.created_at), "MMM dd, yyyy")}
          </div>
          {loan.due_date && (
            <div className={`flex items-center gap-1 ${isOverdue ? "text-red-500" : ""}`}>
              <Clock className="h-3 w-3" />
              Due: {format(new Date(loan.due_date), "MMM dd")}
            </div>
          )}
        </div>

        {/* Actions */}
        {loan.status === "disbursed" && onMakePayment && (
          <Button
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              onMakePayment(loan);
            }}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Make Payment
          </Button>
        )}

        {onViewDetails && (
          <div className="flex items-center justify-center text-sm text-muted-foreground">
            <span>Tap for details</span>
            <ChevronRight className="h-4 w-4" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

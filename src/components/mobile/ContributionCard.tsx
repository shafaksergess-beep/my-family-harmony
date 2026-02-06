import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Clock, AlertTriangle, CreditCard, FileText } from "lucide-react";
import { format } from "date-fns";
import { haptics } from "@/lib/haptics";
import { ContributionReceiptButton } from "@/components/contributions/ContributionReceiptButton";

interface ContributionCardProps {
  contribution: {
    id: string;
    amount: number;
    contribution_date: string;
    payment_date: string | null;
    status: string;
    type: string;
    late_fine: number | null;
    notes: string | null;
    member_name?: string;
  };
  onPay?: (id: string) => void;
  onMarkPaid?: (id: string) => void;
  canManage?: boolean;
  familyName?: string;
}

export function ContributionCard({ contribution, onPay, onMarkPaid, canManage, familyName = 'Family' }: ContributionCardProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "paid":
        return {
          icon: CheckCircle,
          color: "text-green-500",
          bgColor: "bg-green-500/10",
          label: "Paid",
          variant: "default" as const
        };
      case "overdue":
        return {
          icon: AlertTriangle,
          color: "text-destructive",
          bgColor: "bg-destructive/10",
          label: "Overdue",
          variant: "destructive" as const
        };
      default:
        return {
          icon: Clock,
          color: "text-yellow-500",
          bgColor: "bg-yellow-500/10",
          label: "Pending",
          variant: "secondary" as const
        };
    }
  };

  const statusConfig = getStatusConfig(contribution.status);
  const StatusIcon = statusConfig.icon;

  const handlePay = () => {
    haptics.medium();
    onPay?.(contribution.id);
  };

  const handleMarkPaid = () => {
    haptics.success();
    onMarkPaid?.(contribution.id);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "monthly": return "Monthly";
      case "special": return "Special";
      case "fine": return "Fine";
      case "loan_repayment": return "Loan";
      default: return type;
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-stretch">
          {/* Status Indicator */}
          <div className={`w-1.5 ${statusConfig.bgColor}`} />

          {/* Main Content */}
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {/* Amount & Type */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-bold">
                    {contribution.amount.toLocaleString()} FCFA
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {getTypeLabel(contribution.type)}
                  </Badge>
                </div>

                {/* Member Name (if available) */}
                {contribution.member_name && (
                  <p className="text-sm text-muted-foreground truncate">
                    {contribution.member_name}
                  </p>
                )}

                {/* Date */}
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(contribution.contribution_date), "MMM d, yyyy")}
                </p>

                {/* Late Fine */}
                {contribution.late_fine && contribution.late_fine > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <AlertTriangle className="h-3 w-3 text-destructive" />
                    <span className="text-xs text-destructive">
                      +{contribution.late_fine.toLocaleString()} FCFA fine
                    </span>
                  </div>
                )}

                {/* Notes */}
                {contribution.notes && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {contribution.notes}
                  </p>
                )}
              </div>

              {/* Status & Actions */}
              <div className="flex flex-col items-end gap-2">
                <Badge variant={statusConfig.variant} className="gap-1">
                  <StatusIcon className="h-3 w-3" />
                  {statusConfig.label}
                </Badge>

                {contribution.status === "pending" && (
                  <div className="flex gap-1">
                    {onPay && (
                      <Button
                        size="sm"
                        variant="default"
                        className="h-8 px-3"
                        onClick={handlePay}
                      >
                        <CreditCard className="h-3 w-3 mr-1" />
                        Pay
                      </Button>
                    )}
                    {canManage && onMarkPaid && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2"
                        onClick={handleMarkPaid}
                      >
                        <CheckCircle className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}

                {contribution.status === "paid" && (
                  <div className="flex items-center gap-1">
                    <ContributionReceiptButton
                      contribution={contribution}
                      familyName={familyName}
                      size="icon"
                      variant="ghost"
                    />
                    {contribution.payment_date && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(contribution.payment_date), "MMM d")}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

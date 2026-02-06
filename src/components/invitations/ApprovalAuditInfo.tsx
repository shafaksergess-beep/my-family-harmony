import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, UserCheck } from "lucide-react";
import { format } from "date-fns";

interface ApprovalAuditInfoProps {
  status: string;
  reviewedAt?: string;
  reviewer?: {
    full_name: string;
    avatar_url?: string;
  };
  createdAt: string;
  welcomeMessage?: string;
  rejectionReason?: string;
  compact?: boolean;
}

export const ApprovalAuditInfo = ({
  status,
  reviewedAt,
  reviewer,
  createdAt,
  welcomeMessage,
  rejectionReason,
  compact = false,
}: ApprovalAuditInfoProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case "approved":
        return {
          icon: CheckCircle,
          color: "text-green-600",
          bgColor: "bg-green-500/10",
          label: "Approved",
        };
      case "rejected":
        return {
          icon: XCircle,
          color: "text-red-600",
          bgColor: "bg-red-500/10",
          label: "Declined",
        };
      case "info_requested":
        return {
          icon: Clock,
          color: "text-amber-600",
          bgColor: "bg-amber-500/10",
          label: "Info Requested",
        };
      default:
        return {
          icon: Clock,
          color: "text-muted-foreground",
          bgColor: "bg-muted",
          label: "Pending",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={`${config.color} gap-1`}>
          <Icon className="w-3 h-3" />
          {config.label}
        </Badge>
        {reviewer && reviewedAt && (
          <span className="text-xs text-muted-foreground">
            by {reviewer.full_name} on {format(new Date(reviewedAt), "MMM d")}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg ${config.bgColor}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-medium ${config.color}`}>{config.label}</span>
            {reviewedAt && (
              <span className="text-xs text-muted-foreground">
                on {format(new Date(reviewedAt), "MMMM d, yyyy 'at' h:mm a")}
              </span>
            )}
          </div>
          
          {/* Reviewer info */}
          {reviewer && (
            <div className="flex items-center gap-2 mb-2">
              <UserCheck className="w-3 h-3 text-muted-foreground" />
              <Avatar className="w-5 h-5">
                <AvatarImage src={reviewer.avatar_url} />
                <AvatarFallback className="text-[10px]">
                  {reviewer.full_name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">
                {status === "approved" ? "Approved by" : "Reviewed by"} {reviewer.full_name}
              </span>
            </div>
          )}

          {/* Welcome message or rejection reason */}
          {status === "approved" && welcomeMessage && (
            <div className="mt-2 p-2 bg-background rounded border text-sm">
              <p className="italic">"{welcomeMessage}"</p>
            </div>
          )}
          
          {status === "rejected" && rejectionReason && (
            <div className="mt-2 p-2 bg-background rounded border text-sm">
              <p className="text-muted-foreground">{rejectionReason}</p>
            </div>
          )}

          {/* Timeline */}
          <p className="text-xs text-muted-foreground mt-2">
            Request submitted on {format(new Date(createdAt), "MMMM d, yyyy")}
          </p>
        </div>
      </div>
    </div>
  );
};

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Edit, Users, Shield, Lock, CheckCircle2 } from "lucide-react";

interface PermissionExplanationProps {
  role?: string;
  compact?: boolean;
}

const rolePermissions: Record<string, {
  canSee: string[];
  canEdit: string[];
  whoSeesYou: string[];
}> = {
  member: {
    canSee: [
      "Family meetings & schedules",
      "Member directory & contacts",
      "Your own contributions & loans",
      "Family announcements",
    ],
    canEdit: [
      "Your profile information",
      "Your attendance RSVP",
      "Your personal notes",
    ],
    whoSeesYou: [
      "All family members can see your profile",
      "Admins can view your financial records",
    ],
  },
  treasurer: {
    canSee: [
      "All member contributions & payments",
      "Family financial reports",
      "Loan histories for all members",
      "Budget & expense tracking",
    ],
    canEdit: [
      "Record contributions & payments",
      "Manage expenses",
      "Generate financial reports",
    ],
    whoSeesYou: [
      "All family members can see your profile",
      "Members know you manage finances",
    ],
  },
  secretary: {
    canSee: [
      "Meeting attendance records",
      "Family member directory",
      "Meeting minutes & notes",
    ],
    canEdit: [
      "Schedule meetings",
      "Record meeting minutes",
      "Manage attendance",
    ],
    whoSeesYou: [
      "All family members can see your profile",
      "Members know you manage meetings",
    ],
  },
  loan_committee: {
    canSee: [
      "Loan applications",
      "Borrower financial history",
      "Repayment schedules",
    ],
    canEdit: [
      "Approve/reject loans",
      "Set loan terms",
      "Add loan notes",
    ],
    whoSeesYou: [
      "All family members can see your profile",
      "Loan applicants know you review requests",
    ],
  },
  family_admin: {
    canSee: [
      "All family data & records",
      "Member profiles & activity",
      "Financial reports",
    ],
    canEdit: [
      "Manage members & roles",
      "Family settings",
      "Approve join requests",
    ],
    whoSeesYou: [
      "All members see you as administrator",
      "Full access to member records",
    ],
  },
  family_head: {
    canSee: [
      "Complete family records",
      "All member activity",
      "Full audit trail",
    ],
    canEdit: [
      "Everything",
      "Assign any role",
      "All family settings",
    ],
    whoSeesYou: [
      "All members recognize you as family head",
      "Full administrative visibility",
    ],
  },
};

export const PermissionExplanation = ({ role = "member", compact = false }: PermissionExplanationProps) => {
  const permissions = rolePermissions[role] || rolePermissions.member;

  if (compact) {
    return (
      <div className="space-y-3 text-sm">
        <div className="flex items-start gap-2">
          <Eye className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <span className="font-medium">You can view:</span>
            <span className="text-muted-foreground ml-1">
              {permissions.canSee.slice(0, 2).join(", ")}
              {permissions.canSee.length > 2 && " & more"}
            </span>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Edit className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <span className="font-medium">You can edit:</span>
            <span className="text-muted-foreground ml-1">
              {permissions.canEdit.slice(0, 2).join(", ")}
            </span>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Users className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <span className="font-medium">Who sees you:</span>
            <span className="text-muted-foreground ml-1">
              {permissions.whoSeesYou[0]}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Your Permissions & Visibility
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* What you can see */}
        <div>
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <Eye className="w-4 h-4 text-primary" />
            What you can see
          </div>
          <ul className="space-y-1.5 ml-6">
            {permissions.canSee.map((item, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* What you can edit */}
        <div>
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <Edit className="w-4 h-4 text-primary" />
            What you can edit
          </div>
          <ul className="space-y-1.5 ml-6">
            {permissions.canEdit.map((item, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Who can see you */}
        <div>
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <Lock className="w-4 h-4 text-primary" />
            Who can see your profile
          </div>
          <ul className="space-y-1.5 ml-6">
            {permissions.whoSeesYou.map((item, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                <Users className="w-3 h-3 text-muted-foreground shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

import { useTranslation } from "react-i18next";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Assignment {
  month: number;
  member_id: string;
  member_name: string;
  house_name?: string | null;
}

interface Member {
  id: string;
  profiles: { full_name: string } | null;
}

interface Props {
  assignment: Assignment;
  monthName: string;
  members: Member[];
  canManage: boolean;
  isDraggable?: boolean;
  onChangeMember: (memberId: string) => void;
  onDelete: () => void;
}

export const BallotingAssignmentRow = ({
  assignment, monthName, members, canManage, isDraggable, onChangeMember, onDelete,
}: Props) => {
  const { t } = useTranslation();
  if (!canManage) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 border rounded">
        <span className="font-medium text-sm">{monthName}</span>
        <span className="text-muted-foreground text-sm">{assignment.member_name}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2 border rounded bg-card hover:bg-accent/50 transition-colors">
      {isDraggable && (
        <GripVertical className="w-4 h-4 text-muted-foreground shrink-0 cursor-grab" />
      )}
      <span className="font-medium text-sm min-w-0 sm:w-24 sm:shrink-0">{monthName}</span>
      <Select value={assignment.member_id} onValueChange={onChangeMember}>
        <SelectTrigger className="min-w-0 flex-1 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {members.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {member.profiles?.full_name || t("phase3b.unknownMember")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="ghost" size="sm" aria-label={t("phase3b.deleteAssignment")} className="p-0 text-destructive hover:text-destructive" onClick={onDelete}>
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
};

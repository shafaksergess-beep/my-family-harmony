import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Trash2, RotateCcw } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { BallotingAssignmentRow } from "./BallotingAssignmentRow";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  title: string;
  year: number;
  assignments: Assignment[] | null;
  ballotedAt: string | null;
  canManage: boolean;
  members: Member[];
  onSave: (assignments: Assignment[]) => void;
  onDelete: () => void;
  onRunBalloting: () => void;
}

export const BallotingScheduleCard = ({
  title, year, assignments, ballotedAt, canManage, members, onSave, onDelete, onRunBalloting,
}: Props) => {
  const { t, i18n } = useTranslation();
  const monthName = (month: number) => new Date(year, month - 1, 1).toLocaleDateString(i18n.language, { month: "long" });
  const [localAssignments, setLocalAssignments] = useState<Assignment[] | null>(assignments);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync when parent data changes (e.g. after save or reload)
  const assignmentsKey = JSON.stringify(assignments);
  const [lastSyncedKey, setLastSyncedKey] = useState(assignmentsKey);
  if (assignmentsKey !== lastSyncedKey) {
    setLocalAssignments(assignments);
    setLastSyncedKey(assignmentsKey);
    setHasChanges(false);
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !localAssignments) return;
    const items = [...localAssignments];
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    // Keep original month numbers, just reorder the list
    setLocalAssignments(items);
    setHasChanges(true);
  };

  const handleChangeMember = (month: number, memberId: string) => {
    if (!localAssignments) return;
    const member = members.find((m) => m.id === memberId);
    const updated = localAssignments.map((a) =>
      a.month === month
        ? { ...a, member_id: memberId, member_name: member?.profiles?.full_name || "Unknown" }
        : a
    );
    setLocalAssignments(updated);
    setHasChanges(true);
  };

  const handleDeleteMonth = (month: number) => {
    if (!localAssignments) return;
    const filtered = localAssignments.filter((a) => a.month !== month);
    setLocalAssignments(filtered);
    setHasChanges(true);
  };

  const handleAddMonth = () => {
    if (!localAssignments || members.length === 0) return;
    const usedMonths = localAssignments.map((a) => a.month);
    const nextMonth = Array.from({ length: 12 }, (_, i) => i + 1).find((m) => !usedMonths.includes(m));
    if (!nextMonth) return;
    const firstMember = members[0];
    setLocalAssignments([
      ...localAssignments,
      {
        month: nextMonth,
        member_id: firstMember.id,
        member_name: firstMember.profiles?.full_name || "Unknown",
      },
    ]);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (localAssignments) {
      onSave(localAssignments);
      setHasChanges(false);
    }
  };

  const handleReshuffle = () => {
    if (!localAssignments) return;
    const shuffled = [...localAssignments];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tempMember = shuffled[i].member_id;
      const tempName = shuffled[i].member_name;
      const tempHouse = shuffled[i].house_name;
      shuffled[i].member_id = shuffled[j].member_id;
      shuffled[i].member_name = shuffled[j].member_name;
      shuffled[i].house_name = shuffled[j].house_name;
      shuffled[j].member_id = tempMember;
      shuffled[j].member_name = tempName;
      shuffled[j].house_name = tempHouse;
    }
    setLocalAssignments(shuffled);
    setHasChanges(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {title} {year}
          </CardTitle>
          {canManage && localAssignments && (
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={handleReshuffle} title={t("phase3b.reshuffle")} aria-label={t("phase3b.reshuffle")}>
                <RotateCcw className="w-4 h-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" aria-label={t("phase3b.deleteSchedule")} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("phase3b.deleteSchedule")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("phase3b.deleteScheduleConfirm", { title, year })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("famBalloting.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {t("phase3b.deleteSchedule")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {localAssignments && localAssignments.length > 0 ? (
          <div className="space-y-2">
            {canManage ? (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="assignments">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1">
                      {localAssignments.map((assignment, index) => (
                        <Draggable key={`${assignment.month}-${index}`} draggableId={`${assignment.month}-${index}`} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={snapshot.isDragging ? "opacity-80" : ""}
                            >
                              <BallotingAssignmentRow
                                assignment={assignment}
                                monthName={monthName(assignment.month)}
                                members={members}
                                canManage={canManage}
                                onChangeMember={(memberId) => handleChangeMember(assignment.month, memberId)}
                                onDelete={() => handleDeleteMonth(assignment.month)}
                                isDraggable
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            ) : (
              <div className="space-y-1">
                {localAssignments.map((assignment) => (
                  <BallotingAssignmentRow
                    key={assignment.month}
                    assignment={assignment}
                    monthName={monthName(assignment.month)}
                    members={members}
                    canManage={false}
                    onChangeMember={() => {}}
                    onDelete={() => {}}
                  />
                ))}
              </div>
            )}

            {canManage && localAssignments.length < 12 && (
              <Button variant="outline" size="sm" className="w-full mt-2" onClick={handleAddMonth}>
                {t("phase3b.addMonth")}
              </Button>
            )}

            {hasChanges && canManage && (
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button onClick={handleSave} className="flex-1">{t("phase3b.saveChanges")}</Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setLocalAssignments(assignments);
                    setHasChanges(false);
                  }}
                >
                  {t("phase3b.discard")}
                </Button>
              </div>
            )}

            {ballotedAt && (
              <p className="text-xs text-muted-foreground mt-4">
                {t("phase3b.ballotedOn", { date: new Date(ballotedAt).toLocaleDateString(i18n.language) })}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">{t("phase3b.noSchedule", { title, year })}</p>
            {canManage && (
              <Button className="mt-4" onClick={onRunBalloting}>
                {t("famBalloting.runBalloting")}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

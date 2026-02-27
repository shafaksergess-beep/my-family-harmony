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

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const BallotingScheduleCard = ({
  title, year, assignments, ballotedAt, canManage, members, onSave, onDelete, onRunBalloting,
}: Props) => {
  const [localAssignments, setLocalAssignments] = useState<Assignment[] | null>(assignments);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync when parent data changes
  if (assignments !== null && localAssignments === null) {
    setLocalAssignments(assignments);
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !localAssignments) return;
    const items = [...localAssignments];
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    // Re-assign months based on new position
    const reindexed = items.map((item, idx) => ({ ...item, month: idx + 1 }));
    setLocalAssignments(reindexed);
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
    const reindexed = filtered.map((item, idx) => ({ ...item, month: idx + 1 }));
    setLocalAssignments(reindexed);
    setHasChanges(true);
  };

  const handleAddMonth = () => {
    if (!localAssignments || members.length === 0) return;
    const nextMonth = localAssignments.length + 1;
    if (nextMonth > 12) return;
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
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {title} {year}
          </CardTitle>
          {canManage && localAssignments && (
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={handleReshuffle} title="Reshuffle members">
                <RotateCcw className="w-4 h-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete the entire {title.toLowerCase()} schedule for {year}? This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
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
                                monthName={MONTH_NAMES[assignment.month - 1] || `Month ${assignment.month}`}
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
                    monthName={MONTH_NAMES[assignment.month - 1] || `Month ${assignment.month}`}
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
                + Add Month
              </Button>
            )}

            {hasChanges && canManage && (
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button onClick={handleSave} className="flex-1">Save Changes</Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setLocalAssignments(assignments);
                    setHasChanges(false);
                  }}
                >
                  Discard
                </Button>
              </div>
            )}

            {ballotedAt && (
              <p className="text-xs text-muted-foreground mt-4">
                Balloted on: {new Date(ballotedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No {title.toLowerCase()} for {year}</p>
            {canManage && (
              <Button className="mt-4" onClick={onRunBalloting}>
                Run Balloting
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

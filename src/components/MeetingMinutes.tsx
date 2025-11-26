import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Trash2, Save, Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Decision {
  title: string;
  description: string;
}

interface ActionItem {
  task: string;
  assignee: string;
  deadline: string;
}

interface Minutes {
  id?: string;
  content: string;
  decisions_made: Decision[];
  action_items: ActionItem[];
}

interface MeetingMinutesProps {
  meetingId: string;
  canEdit: boolean;
}

export const MeetingMinutes = ({ meetingId, canEdit }: MeetingMinutesProps) => {
  const { toast } = useToast();
  const [minutes, setMinutes] = useState<Minutes>({
    content: "",
    decisions_made: [],
    action_items: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeEditors, setActiveEditors] = useState<string[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [newDecision, setNewDecision] = useState<Decision>({ title: "", description: "" });
  const [newAction, setNewAction] = useState<ActionItem>({ task: "", assignee: "", deadline: "" });

  useEffect(() => {
    loadMinutes();
    setupRealtimeCollaboration();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [meetingId]);

  const setupRealtimeCollaboration = useCallback(async () => {
    if (!meetingId) return;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Create a channel for this meeting
    const meetingChannel = supabase.channel(`meeting_minutes:${meetingId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    // Track who's viewing/editing
    meetingChannel
      .on('presence', { event: 'sync' }, () => {
        const state = meetingChannel.presenceState();
        const editors = Object.keys(state).filter(key => key !== user.id);
        setActiveEditors(editors);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        console.log('User joined:', key);
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        console.log('User left:', key);
      });

    // Listen for realtime updates to minutes
    meetingChannel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_minutes',
          filter: `meeting_id=eq.${meetingId}`,
        },
        (payload) => {
          console.log('Minutes updated:', payload);
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            loadMinutes();
          }
        }
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await meetingChannel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    setChannel(meetingChannel);
  }, [meetingId]);

  const loadMinutes = async () => {
    try {
      const { data, error } = await supabase
        .from("meeting_minutes")
        .select("*")
        .eq("meeting_id", meetingId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setMinutes({
          id: data.id,
          content: data.content || "",
          decisions_made: (data.decisions_made as unknown as Decision[]) || [],
          action_items: (data.action_items as unknown as ActionItem[]) || [],
        });
      }
    } catch (error: any) {
      console.error("Error loading minutes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!minutes.content) {
      toast({
        title: "No content",
        description: "Please add meeting minutes first",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      // Fetch agenda items
      const { data: agendaData } = await supabase
        .from("meeting_agenda_items")
        .select("title, description")
        .eq("meeting_id", meetingId)
        .order("order_index");

      const { data: summaryData, error: summaryError } = await supabase.functions.invoke(
        "generate-meeting-summary",
        {
          body: {
            meetingContent: minutes.content,
            agendaItems: agendaData || [],
            actionItems: minutes.action_items,
          },
        }
      );

      if (summaryError) throw summaryError;

      if (summaryData?.error) {
        toast({
          title: "AI Error",
          description: summaryData.error,
          variant: "destructive",
        });
        return;
      }

      // Append the AI summary to the content
      const summary = summaryData.summary;
      setMinutes(prev => {
        const separator = "\n\n---\n\n## AI-Generated Summary\n\n";
        return {
          ...prev,
          content: prev.content + separator + summary
        };
      });

      toast({
        title: "Summary Generated",
        description: "AI summary has been added to the meeting minutes",
      });
    } catch (error: any) {
      console.error("Error generating summary:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate summary",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        meeting_id: meetingId,
        content: minutes.content,
        decisions_made: minutes.decisions_made as any,
        action_items: minutes.action_items as any,
        recorded_by: (await supabase.auth.getUser()).data.user?.id,
      };

      if (minutes.id) {
        const { error } = await supabase
          .from("meeting_minutes")
          .update(payload)
          .eq("id", minutes.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("meeting_minutes")
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        setMinutes({ ...minutes, id: data.id });
      }

      toast({
        title: "Success",
        description: "Meeting minutes saved",
      });
    } catch (error: any) {
      console.error("Error saving minutes:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save minutes",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddDecision = () => {
    if (!newDecision.title.trim()) return;
    setMinutes({
      ...minutes,
      decisions_made: [...minutes.decisions_made, newDecision],
    });
    setNewDecision({ title: "", description: "" });
  };

  const handleAddAction = () => {
    if (!newAction.task.trim()) return;
    setMinutes({
      ...minutes,
      action_items: [...minutes.action_items, newAction],
    });
    setNewAction({ task: "", assignee: "", deadline: "" });
  };

  const handleRemoveDecision = (index: number) => {
    setMinutes({
      ...minutes,
      decisions_made: minutes.decisions_made.filter((_, i) => i !== index),
    });
  };

  const handleRemoveAction = (index: number) => {
    setMinutes({
      ...minutes,
      action_items: minutes.action_items.filter((_, i) => i !== index),
    });
  };

  if (loading) {
    return <div>Loading minutes...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Meeting Minutes
            </CardTitle>
            {canEdit && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleGenerateSummary}
                  disabled={generating || !minutes.content}
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      AI Summary
                    </>
                  )}
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save Minutes"}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Content */}
          <div>
            <Label htmlFor="content">Meeting Notes</Label>
            <Textarea
              id="content"
              value={minutes.content}
              onChange={(e) => setMinutes({ ...minutes, content: e.target.value })}
              placeholder="Document the main discussions, topics covered, and general notes from the meeting..."
              rows={8}
              disabled={!canEdit}
              className="mt-2"
            />
          </div>

          {/* Decisions Made */}
          <div>
            <h4 className="font-semibold mb-3">Decisions Made</h4>
            {minutes.decisions_made.length > 0 ? (
              <div className="space-y-2 mb-4">
                {minutes.decisions_made.map((decision, index) => (
                  <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{decision.title}</p>
                      {decision.description && (
                        <p className="text-sm text-muted-foreground mt-1">{decision.description}</p>
                      )}
                    </div>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDecision(index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-4">No decisions recorded yet</p>
            )}

            {canEdit && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                <Input
                  placeholder="Decision title"
                  value={newDecision.title}
                  onChange={(e) => setNewDecision({ ...newDecision, title: e.target.value })}
                />
                <Textarea
                  placeholder="Decision description (optional)"
                  value={newDecision.description}
                  onChange={(e) => setNewDecision({ ...newDecision, description: e.target.value })}
                  rows={2}
                />
                <Button onClick={handleAddDecision} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Decision
                </Button>
              </div>
            )}
          </div>

          {/* Action Items */}
          <div>
            <h4 className="font-semibold mb-3">Action Items</h4>
            {minutes.action_items.length > 0 ? (
              <div className="space-y-2 mb-4">
                {minutes.action_items.map((action, index) => (
                  <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{action.task}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {action.assignee && (
                          <Badge variant="secondary">{action.assignee}</Badge>
                        )}
                        {action.deadline && (
                          <span className="text-sm text-muted-foreground">
                            Due: {new Date(action.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAction(index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-4">No action items recorded yet</p>
            )}

            {canEdit && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                <Input
                  placeholder="Action item / task"
                  value={newAction.task}
                  onChange={(e) => setNewAction({ ...newAction, task: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Assignee"
                    value={newAction.assignee}
                    onChange={(e) => setNewAction({ ...newAction, assignee: e.target.value })}
                  />
                  <Input
                    type="date"
                    placeholder="Deadline"
                    value={newAction.deadline}
                    onChange={(e) => setNewAction({ ...newAction, deadline: e.target.value })}
                  />
                </div>
                <Button onClick={handleAddAction} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Action Item
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

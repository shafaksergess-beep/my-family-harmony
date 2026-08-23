import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, GripVertical, Clock, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface AgendaItem {
  id?: string;
  title: string;
  description: string;
  time_allocation: number;
  requires_vote: boolean;
  order_index: number;
}

interface MeetingAgendaBuilderProps {
  meetingId: string;
  canEdit: boolean;
}

export const MeetingAgendaBuilder = ({ meetingId, canEdit }: MeetingAgendaBuilderProps) => {
  const { toast } = useToast();
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [familyId, setFamilyId] = useState<string>("");
  const [newItem, setNewItem] = useState<AgendaItem>({
    title: "",
    description: "",
    time_allocation: 15,
    requires_vote: false,
    order_index: 0,
  });

  useEffect(() => {
    loadAgenda();
    loadTemplates();
  }, [meetingId]);

  const loadTemplates = async () => {
    try {
      const { data: meeting } = await supabase
        .from("meetings")
        .select("family_id")
        .eq("id", meetingId)
        .single();

      if (!meeting) return;

      setFamilyId(meeting.family_id);

      const { data, error } = await supabase
        .from("meeting_templates")
        .select("*")
        .eq("family_id", meeting.family_id)
        .order("name");

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error("Error loading templates:", error);
    }
  };

  const applyTemplate = async (templateId: string) => {
    try {
      const template = templates.find(t => t.id === templateId);
      if (!template || !template.agenda_items) return;

      // Add all items from template
      for (const item of template.agenda_items) {
        await supabase
          .from("meeting_agenda_items")
          .insert({
            meeting_id: meetingId,
            title: item.title,
            description: item.description,
            time_allocation: item.time_allocation,
            requires_vote: item.requires_vote,
            order_index: agendaItems.length + template.agenda_items.indexOf(item),
          });
      }

      toast({
        title: "Success",
        description: "Template applied to agenda",
      });

      setSelectedTemplate("");
      loadAgenda();
    } catch (error: any) {
      console.error("Error applying template:", error);
      toast({
        title: "Error",
        description: "Failed to apply template",
        variant: "destructive",
      });
    }
  };

  const saveAsTemplate = async () => {
    if (!templateName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a template name",
        variant: "destructive",
      });
      return;
    }

    if (agendaItems.length === 0) {
      toast({
        title: "Error",
        description: "No agenda items to save",
        variant: "destructive",
      });
      return;
    }

    try {
      const templateItems = agendaItems.map(item => ({
        title: item.title,
        description: item.description,
        time_allocation: item.time_allocation,
        requires_vote: item.requires_vote,
      }));

      const { error } = await supabase
        .from("meeting_templates")
        .insert({
          family_id: familyId,
          name: templateName,
          description: templateDescription,
          agenda_items: templateItems,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Agenda saved as template",
      });

      setTemplateName("");
      setTemplateDescription("");
      setIsSaveDialogOpen(false);
      loadTemplates();
    } catch (error: any) {
      console.error("Error saving template:", error);
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive",
      });
    }
  };

  const loadAgenda = async () => {
    try {
      const { data, error } = await supabase
        .from("meeting_agenda_items")
        .select("*")
        .eq("meeting_id", meetingId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      setAgendaItems(data || []);
    } catch (error: any) {
      console.error("Error loading agenda:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter an agenda title",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("meeting_agenda_items")
        .insert({
          meeting_id: meetingId,
          ...newItem,
          order_index: agendaItems.length,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Agenda item added",
      });

      setNewItem({
        title: "",
        description: "",
        time_allocation: 15,
        requires_vote: false,
        order_index: 0,
      });
      loadAgenda();
    } catch (error: any) {
      console.error("Error adding agenda item:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add agenda item",
        variant: "destructive",
      });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("meeting_agenda_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Agenda item deleted",
      });
      loadAgenda();
    } catch (error: any) {
      console.error("Error deleting agenda item:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete agenda item",
        variant: "destructive",
      });
    }
  };

  const totalTime = agendaItems.reduce((sum, item) => sum + item.time_allocation, 0);

  if (loading) {
    return <div>Loading agenda...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Meeting Agenda</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              <Clock className="w-3 h-3 mr-1" />
              {totalTime} minutes total
            </Badge>
            {canEdit && agendaItems.length > 0 && (
              <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Save className="w-4 h-4 mr-2" />
                    Save as Template
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Save Agenda as Template</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="template-name">Template Name</Label>
                      <Input
                        id="template-name"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="e.g., Monthly Financial Review"
                      />
                    </div>
                    <div>
                      <Label htmlFor="template-desc">Description (optional)</Label>
                      <Textarea
                        id="template-desc"
                        value={templateDescription}
                        onChange={(e) => setTemplateDescription(e.target.value)}
                        placeholder="Brief description of this template"
                        rows={2}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={saveAsTemplate}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Template
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Agenda Items */}
        {agendaItems.length > 0 ? (
          <div className="space-y-3">
            {agendaItems.map((item, index) => (
              <div key={item.id} className="flex items-start gap-3 p-4 border rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <GripVertical className="w-4 h-4" />
                  <span className="font-semibold">{index + 1}.</span>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{item.title}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        <Clock className="w-3 h-3 mr-1" />
                        {item.time_allocation} min
                      </Badge>
                      {item.requires_vote && (
                        <Badge>Requires Vote</Badge>
                      )}
                    </div>
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  )}
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteItem(item.id!)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No agenda items yet. Add items below to structure your meeting.
          </p>
        )}

        {/* Add New Item Form */}
        {canEdit && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-semibold">Add Agenda Item</h4>
            
            {/* Template Selector */}
            {templates.length > 0 && (
              <div className="flex gap-2">
                <select
                  aria-label="Select an agenda template"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                >
                  <option value="">Select a template...</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={() => selectedTemplate && applyTemplate(selectedTemplate)}
                  disabled={!selectedTemplate}
                >
                  Apply Template
                </Button>
              </div>
            )}
            <div className="space-y-3">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  placeholder="e.g., Budget Review"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Brief description of the topic"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="time">Time Allocation (minutes)</Label>
                  <Input
                    id="time"
                    type="number"
                    min="5"
                    step="5"
                    value={newItem.time_allocation}
                    onChange={(e) => setNewItem({ ...newItem, time_allocation: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="vote"
                    checked={newItem.requires_vote}
                    onCheckedChange={(checked) => setNewItem({ ...newItem, requires_vote: checked })}
                  />
                  <Label htmlFor="vote">Requires Vote</Label>
                </div>
              </div>
              <Button onClick={handleAddItem} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { Loader2, ArrowLeft, Plus, Trash2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Template {
  id: string;
  name: string;
  description: string | null;
  agenda_items: any[];
}

const MeetingTemplates = () => {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { family, isFamilyHead, isLoading: authLoading } = useFamilyAuth(familySlug);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    agenda_items: [] as any[],
  });

  useEffect(() => {
    if (family) {
      loadTemplates();
    }
  }, [family]);

  const loadTemplates = async () => {
    if (!family) return;

    try {
      const { data, error } = await supabase
        .from("meeting_templates")
        .select("*")
        .eq("family_id", family.id)
        .order("name");

      if (error) throw error;
      const castData = (data || []).map(t => ({
        ...t,
        agenda_items: Array.isArray(t.agenda_items) ? t.agenda_items : []
      })) as Template[];
      setTemplates(castData);
    } catch (error: any) {
      console.error("Error loading templates:", error);
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!family || !newTemplate.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a template name",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("meeting_templates")
        .insert({
          family_id: family.id,
          name: newTemplate.name,
          description: newTemplate.description,
          agenda_items: [],
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template created",
      });

      setNewTemplate({ name: "", description: "", agenda_items: [] });
      setShowForm(false);
      loadTemplates();
    } catch (error: any) {
      console.error("Error creating template:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create template",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from("meeting_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template deleted",
      });
      loadTemplates();
    } catch (error: any) {
      console.error("Error deleting template:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isFamilyHead) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p>Only family heads can manage meeting templates</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(`/family/${familySlug}`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">Meeting Templates</h1>
              <p className="text-sm text-muted-foreground">{family?.name}</p>
            </div>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Create New Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="e.g., Standard Monthly Meeting"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  placeholder="Brief description of this template"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateTemplate}>Create Template</Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No templates yet. Create your first meeting template.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{template.name}</CardTitle>
                      {template.description && (
                        <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline">
                    {template.agenda_items?.length || 0} agenda items
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MeetingTemplates;

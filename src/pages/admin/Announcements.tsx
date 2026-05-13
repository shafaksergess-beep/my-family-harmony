import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Megaphone, Trash2, Loader2 } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  body: string;
  severity: string;
  active: boolean;
  starts_at: string;
  ends_at: string | null;
  link_url: string | null;
  link_label: string | null;
}

export default function Announcements() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: "",
    body: "",
    severity: "info",
    link_url: "",
    link_label: "",
    ends_at: "",
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("system_announcements")
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data as Announcement[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate("/auth");
      const { data: sa } = await supabase
        .from("super_admins")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!sa) {
        toast({ title: "Access denied", variant: "destructive" });
        return navigate("/dashboard");
      }
      load();
    })();
  }, []);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast({ title: "Title and body are required", variant: "destructive" });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("system_announcements").insert({
      title: form.title.trim(),
      body: form.body.trim(),
      severity: form.severity,
      link_url: form.link_url.trim() || null,
      link_label: form.link_label.trim() || null,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      created_by: user?.id,
    });
    if (error) {
      toast({ title: "Failed to publish", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Announcement published" });
    setForm({ title: "", body: "", severity: "info", link_url: "", link_label: "", ends_at: "" });
    load();
  };

  const toggleActive = async (a: Announcement) => {
    const { error } = await supabase
      .from("system_announcements")
      .update({ active: !a.active })
      .eq("id", a.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    await supabase.from("system_announcements").delete().eq("id", id);
    load();
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Megaphone className="w-6 h-6" /> System Announcements
            </h1>
            <p className="text-sm text-muted-foreground">
              Publish dismissible banners shown to all signed-in users.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">New announcement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={120}
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={3}
                maxLength={500}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Severity</Label>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ends at (optional)</Label>
                <Input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                />
              </div>
              <div>
                <Label>Link label</Label>
                <Input
                  value={form.link_label}
                  onChange={(e) => setForm({ ...form, link_label: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Link URL (optional)</Label>
              <Input
                value={form.link_url}
                onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <Button onClick={handleCreate}>Publish</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">All announcements</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No announcements yet.</p>
            ) : (
              <div className="space-y-3">
                {items.map((a) => (
                  <div key={a.id} className="flex items-start justify-between gap-3 p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={a.severity === "warning" ? "destructive" : "secondary"}>
                          {a.severity}
                        </Badge>
                        {!a.active && <Badge variant="outline">inactive</Badge>}
                        <span className="font-medium">{a.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{a.body}</p>
                      {a.ends_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Ends: {new Date(a.ends_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={a.active} onCheckedChange={() => toggleActive(a)} />
                      <Button variant="ghost" size="icon" onClick={() => remove(a.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

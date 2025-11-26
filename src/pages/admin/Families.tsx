import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, ArrowLeft, Building2, Users, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Family {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

const AdminFamilies = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [families, setFamilies] = useState<Family[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
  });

  useEffect(() => {
    checkAuth();
    loadFamilies();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: superAdminData } = await supabase
      .from("super_admins")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (!superAdminData) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  };

  const loadFamilies = async () => {
    try {
      const { data, error } = await supabase
        .from("families")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFamilies(data || []);
    } catch (error) {
      console.error("Error loading families:", error);
      toast({
        title: "Error",
        description: "Failed to load families",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingFamily) {
        const { error } = await supabase
          .from("families")
          .update({
            name: formData.name,
            slug: formData.slug,
            description: formData.description,
          })
          .eq("id", editingFamily.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Family updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("families")
          .insert({
            name: formData.name,
            slug: formData.slug,
            description: formData.description,
          });

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Family created successfully",
        });
      }

      setIsDialogOpen(false);
      setEditingFamily(null);
      setFormData({ name: "", slug: "", description: "" });
      loadFamilies();
    } catch (error: any) {
      console.error("Error saving family:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save family",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (family: Family) => {
    setEditingFamily(family);
    setFormData({
      name: family.name,
      slug: family.slug,
      description: family.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (familyId: string) => {
    if (!confirm("Are you sure you want to delete this family? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("families")
        .delete()
        .eq("id", familyId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Family deleted successfully",
      });
      loadFamilies();
    } catch (error: any) {
      console.error("Error deleting family:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete family",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Family Management</h1>
                <p className="text-sm text-muted-foreground">Manage all families in the system</p>
              </div>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingFamily(null);
                  setFormData({ name: "", slug: "", description: "" });
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Family
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingFamily ? "Edit Family" : "Create New Family"}</DialogTitle>
                  <DialogDescription>
                    {editingFamily ? "Update family information" : "Add a new family to the system"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Family Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter family name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug (URL-friendly)</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                      placeholder="family-name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of the family"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingFamily ? "Update" : "Create"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {families.length === 0 ? (
          <Card className="p-12 text-center">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2 text-foreground">No families yet</h3>
            <p className="text-muted-foreground mb-6">Create your first family to get started</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Family
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {families.map((family) => (
              <Card key={family.id} className="hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Building2 className="w-10 h-10 text-primary" />
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(family)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(family.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle>{family.name}</CardTitle>
                  <CardDescription>{family.description || "No description"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">Slug:</span>
                      <code className="bg-muted px-2 py-1 rounded text-xs">{family.slug}</code>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">Status:</span>
                      <span className={`px-2 py-1 rounded text-xs ${family.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {family.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      className="flex-1" 
                      variant="outline"
                      onClick={() => navigate(`/admin/families/${family.id}/members`)}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Members
                    </Button>
                    <Button 
                      className="flex-1" 
                      onClick={() => navigate(`/family/${family.slug}/analytics`)}
                    >
                      Analytics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminFamilies;

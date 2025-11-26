import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, ArrowLeft, Building2, Users, Edit, Trash2, Shield, FileText, Download } from "lucide-react";
import { logAdminActivity } from "@/lib/adminLogger";
import { exportToCSV, formatFamiliesForExport } from "@/lib/export";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

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
  const { t } = useTranslation();
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
        title: t("admin.accessDenied"),
        description: t("admin.noPermission"),
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
        title: t("common.error"),
        description: t("admin.loadFailed"),
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
        
        // Log activity
        await logAdminActivity({
          action_type: 'update',
          entity_type: 'family',
          entity_id: editingFamily.id,
          details: { name: formData.name, slug: formData.slug }
        });
        
        toast({
          title: t("common.success"),
          description: t("admin.familyUpdated"),
        });
      } else {
        const { data, error } = await supabase
          .from("families")
          .insert({
            name: formData.name,
            slug: formData.slug,
            description: formData.description,
          })
          .select()
          .single();

        if (error) throw error;
        
        // Log activity
        await logAdminActivity({
          action_type: 'create',
          entity_type: 'family',
          entity_id: data?.id,
          details: { name: formData.name, slug: formData.slug }
        });
        
        toast({
          title: t("common.success"),
          description: t("admin.familyCreated"),
        });
      }

      setIsDialogOpen(false);
      setEditingFamily(null);
      setFormData({ name: "", slug: "", description: "" });
      loadFamilies();
    } catch (error: any) {
      console.error("Error saving family:", error);
      toast({
        title: t("common.error"),
        description: error.message || t("admin.saveFailed"),
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
    if (!confirm(t("admin.deleteConfirm"))) {
      return;
    }

    try {
      const family = families.find(f => f.id === familyId);
      
      const { error } = await supabase
        .from("families")
        .delete()
        .eq("id", familyId);

      if (error) throw error;
      
      // Log activity
      await logAdminActivity({
        action_type: 'delete',
        entity_type: 'family',
        entity_id: familyId,
        details: { name: family?.name }
      });
      
      toast({
        title: t("common.success"),
        description: t("admin.familyDeleted"),
      });
      loadFamilies();
    } catch (error: any) {
      console.error("Error deleting family:", error);
      toast({
        title: t("common.error"),
        description: error.message || t("admin.deleteFailed"),
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    const formatted = formatFamiliesForExport(families);
    exportToCSV(formatted, `families-${new Date().toISOString().split('T')[0]}`);
    
    logAdminActivity({
      action_type: 'export',
      entity_type: 'family',
      details: { count: families.length }
    });
    
    toast({
      title: t("common.success"),
      description: "Families exported successfully",
    });
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
                {t("common.back")}
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t("admin.familyManagement")}</h1>
                <p className="text-sm text-muted-foreground">{t("admin.familyManagementDesc")}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {families.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => navigate("/admin/permissions")}>
                <Shield className="w-4 h-4 mr-2" />
                Permissions
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/admin/activity-logs")}>
                <FileText className="w-4 h-4 mr-2" />
                Activity Logs
              </Button>
              <LanguageSwitcher />
            
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingFamily(null);
                    setFormData({ name: "", slug: "", description: "" });
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("admin.createFamily")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingFamily ? t("admin.editFamily") : t("admin.createNewFamily")}</DialogTitle>
                    <DialogDescription>
                      {editingFamily ? t("admin.updateFamilyInfo") : t("admin.addNewFamily")}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t("admin.familyName")}</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={t("admin.familyName")}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slug">{t("admin.slug")}</Label>
                      <Input
                        id="slug"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                        placeholder="family-name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">{t("admin.description")}</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder={t("admin.descriptionPlaceholder")}
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        {t("common.cancel")}
                      </Button>
                      <Button type="submit">
                        {editingFamily ? t("common.edit") : t("common.create")}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {families.length === 0 ? (
          <Card className="p-12 text-center">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2 text-foreground">{t("admin.noFamiliesYet")}</h3>
            <p className="text-muted-foreground mb-6">{t("admin.createFirstFamily")}</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t("admin.createFamily")}
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
                  <CardDescription>{family.description || t("admin.noDescription")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{t("admin.slug")}:</span>
                      <code className="bg-muted px-2 py-1 rounded text-xs">{family.slug}</code>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{t("admin.status")}:</span>
                      <span className={`px-2 py-1 rounded text-xs ${family.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {family.is_active ? t("admin.active") : t("admin.inactive")}
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
                      {t("admin.members")}
                    </Button>
                    <Button 
                      className="flex-1" 
                      onClick={() => navigate(`/family/${family.slug}/analytics`)}
                    >
                      {t("admin.analytics")}
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

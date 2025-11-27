import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Plus, Edit, Trash2, GripVertical } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ModuleCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  order_index: number;
  icon: string | null;
  color: string | null;
}

interface Module {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  route_path: string;
  icon: string | null;
  color: string | null;
  category_id: string | null;
  order_index: number;
  is_active: boolean;
}

export default function ModuleManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<ModuleCategory[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ModuleCategory | null>(null);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);

  useEffect(() => {
    checkSuperAdmin();
    loadData();
  }, []);

  const checkSuperAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase
      .from("super_admins")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      toast({
        title: "Access Denied",
        description: "Only super admins can manage modules",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }

    setIsSuperAdmin(true);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [categoriesRes, modulesRes] = await Promise.all([
        supabase.from("module_categories").select("*").order("order_index"),
        supabase.from("modules").select("*").order("order_index"),
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (modulesRes.error) throw modulesRes.error;

      setCategories(categoriesRes.data || []);
      setModules(modulesRes.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load module data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategory = async (formData: Partial<ModuleCategory>) => {
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from("module_categories")
          .update(formData)
          .eq("id", editingCategory.id);

        if (error) throw error;
        toast({ title: "Success", description: "Category updated successfully" });
      } else {
        const { error } = await supabase
          .from("module_categories")
          .insert([{
            name: formData.name,
            slug: formData.slug,
            description: formData.description || null,
            icon: formData.icon || null,
            color: formData.color || null,
            order_index: formData.order_index,
          }]);

        if (error) throw error;
        toast({ title: "Success", description: "Category created successfully" });
      }

      setIsCategoryDialogOpen(false);
      setEditingCategory(null);
      loadData();
    } catch (error) {
      console.error("Error saving category:", error);
      toast({
        title: "Error",
        description: "Failed to save category",
        variant: "destructive",
      });
    }
  };

  const handleSaveModule = async (formData: Partial<Module>) => {
    try {
      if (editingModule) {
        const { error } = await supabase
          .from("modules")
          .update(formData)
          .eq("id", editingModule.id);

        if (error) throw error;
        toast({ title: "Success", description: "Module updated successfully" });
      } else {
        const { error } = await supabase
          .from("modules")
          .insert([{
            name: formData.name,
            slug: formData.slug,
            description: formData.description || null,
            route_path: formData.route_path,
            icon: formData.icon || null,
            color: formData.color || null,
            category_id: formData.category_id || null,
            order_index: formData.order_index,
            is_active: formData.is_active,
          }]);

        if (error) throw error;
        toast({ title: "Success", description: "Module created successfully" });
      }

      setIsModuleDialogOpen(false);
      setEditingModule(null);
      loadData();
    } catch (error) {
      console.error("Error saving module:", error);
      toast({
        title: "Error",
        description: "Failed to save module",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const { error } = await supabase
        .from("module_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Success", description: "Category deleted successfully" });
      loadData();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  const handleDeleteModule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this module?")) return;

    try {
      const { error } = await supabase
        .from("modules")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Success", description: "Module deleted successfully" });
      loadData();
    } catch (error) {
      console.error("Error deleting module:", error);
      toast({
        title: "Error",
        description: "Failed to delete module",
        variant: "destructive",
      });
    }
  };

  if (loading || !isSuperAdmin) {
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
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/admin/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Module Management</h1>
              <p className="text-sm text-muted-foreground">Configure dashboard modules and categories</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="categories" className="space-y-6">
          <TabsList>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="modules">Modules</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Module Categories</h2>
              <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingCategory(null)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingCategory ? "Edit" : "Create"} Category</DialogTitle>
                  </DialogHeader>
                  <CategoryForm
                    category={editingCategory}
                    onSave={handleSaveCategory}
                    onCancel={() => {
                      setIsCategoryDialogOpen(false);
                      setEditingCategory(null);
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {categories.map((category) => (
                <Card key={category.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{category.name}</CardTitle>
                        <CardDescription>{category.description || "No description"}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingCategory(category);
                            setIsCategoryDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="modules" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Modules</h2>
              <Dialog open={isModuleDialogOpen} onOpenChange={setIsModuleDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingModule(null)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Module
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingModule ? "Edit" : "Create"} Module</DialogTitle>
                  </DialogHeader>
                  <ModuleForm
                    module={editingModule}
                    categories={categories}
                    onSave={handleSaveModule}
                    onCancel={() => {
                      setIsModuleDialogOpen(false);
                      setEditingModule(null);
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {modules.map((module) => (
                <Card key={module.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <CardTitle>{module.name}</CardTitle>
                        <CardDescription>
                          {module.description || "No description"}
                          {module.category_id && (
                            <span className="ml-2 text-xs">
                              • {categories.find(c => c.id === module.category_id)?.name || "Uncategorized"}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingModule(module);
                            setIsModuleDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteModule(module.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function CategoryForm({ category, onSave, onCancel }: {
  category: ModuleCategory | null;
  onSave: (data: Partial<ModuleCategory>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: category?.name || "",
    slug: category?.slug || "",
    description: category?.description || "",
    icon: category?.icon || "",
    color: category?.color || "",
    order_index: category?.order_index || 0,
  });

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          value={formData.slug}
          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="icon">Icon (Lucide name)</Label>
        <Input
          id="icon"
          value={formData.icon}
          onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
          placeholder="Calendar, Users, Heart, etc."
        />
      </div>
      <div>
        <Label htmlFor="color">Color Class</Label>
        <Input
          id="color"
          value={formData.color}
          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
          placeholder="text-purple-600"
        />
      </div>
      <div>
        <Label htmlFor="order">Order Index</Label>
        <Input
          id="order"
          type="number"
          value={formData.order_index}
          onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(formData)}>Save</Button>
      </div>
    </div>
  );
}

function ModuleForm({ module, categories, onSave, onCancel }: {
  module: Module | null;
  categories: ModuleCategory[];
  onSave: (data: Partial<Module>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: module?.name || "",
    slug: module?.slug || "",
    description: module?.description || "",
    route_path: module?.route_path || "",
    icon: module?.icon || "",
    color: module?.color || "",
    category_id: module?.category_id || "",
    order_index: module?.order_index || 0,
    is_active: module?.is_active ?? true,
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="route">Route Path</Label>
        <Input
          id="route"
          value={formData.route_path}
          onChange={(e) => setFormData({ ...formData, route_path: e.target.value })}
          placeholder="/meetings"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="icon">Icon (Lucide name)</Label>
          <Input
            id="icon"
            value={formData.icon}
            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
            placeholder="Calendar, Users, Heart"
          />
        </div>
        <div>
          <Label htmlFor="color">Color Class</Label>
          <Input
            id="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            placeholder="text-purple-600"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">Category</Label>
          <Select
            value={formData.category_id}
            onValueChange={(value) => setFormData({ ...formData, category_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="order">Order Index</Label>
          <Input
            id="order"
            type="number"
            value={formData.order_index}
            onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(formData)}>Save</Button>
      </div>
    </div>
  );
}

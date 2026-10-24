import { ManagementHeader } from "@/components/layout/ManagementMobile";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import * as LucideIcons from "lucide-react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import SEO from "@/components/SEO";

interface ModuleCategory {
  id: string;
  name: string;
  slug: string;
  order_index: number;
}

interface ModuleRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  category_id: string | null;
  order_index: number;
}

/**
 * Per-family module activation. Family heads, family admins and super
 * admins can switch modules on/off for their group; members keep
 * read access to the settings through RLS but cannot change them.
 */
export default function ModuleSettings() {
  const { t } = useTranslation();
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { family, isLoading, isFamilyHead, isFamilyAdmin, isSuperAdmin } =
    useFamilyAuth(familySlug);

  const [categories, setCategories] = useState<ModuleCategory[]>([]);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);

  const canManage = isFamilyHead || isFamilyAdmin || isSuperAdmin;

  useEffect(() => {
    if (isLoading || !family) return;
    if (!canManage) {
      toast.error(t("moduleSettings.accessDenied"));
      navigate(`/family/${familySlug}`, { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      const [categoriesRes, modulesRes, settingsRes] = await Promise.all([
        supabase.from("module_categories").select("*").order("order_index"),
        supabase
          .from("modules")
          .select("*")
          .eq("is_active", true)
          .order("order_index"),
        supabase
          .from("family_module_settings")
          .select("module_id, is_enabled")
          .eq("family_id", family.id),
      ]);
      if (cancelled) return;
      if (categoriesRes.error || modulesRes.error || settingsRes.error) {
        toast.error(t("moduleSettings.loadError"));
        setLoading(false);
        return;
      }
      const settingsMap: Record<string, boolean> = {};
      (settingsRes.data || []).forEach((row) => {
        settingsMap[row.module_id] = row.is_enabled ?? true;
      });
      setCategories(categoriesRes.data || []);
      setModules(modulesRes.data || []);
      // Default-on: modules without a settings row are enabled.
      const enabledMap: Record<string, boolean> = {};
      (modulesRes.data || []).forEach((m) => {
        enabledMap[m.id] = settingsMap[m.id] ?? true;
      });
      setEnabled(enabledMap);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoading, family, canManage, familySlug, navigate, t]);

  const toggleModule = async (module: ModuleRow, value: boolean) => {
    if (!family) return;
    setSavingSlug(module.id);
    setEnabled((prev) => ({ ...prev, [module.id]: value }));
    try {
      const { data: existing } = await supabase
        .from("family_module_settings")
        .select("id")
        .eq("family_id", family.id)
        .eq("module_id", module.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("family_module_settings")
          .update({ is_enabled: value, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("family_module_settings")
          .insert({
            family_id: family.id,
            module_id: module.id,
            is_enabled: value,
          });
        if (error) throw error;
      }
      toast.success(
        value
          ? t("moduleSettings.moduleEnabled", { name: module.name })
          : t("moduleSettings.moduleDisabledToast", { name: module.name }),
      );
    } catch (error) {
      console.error("Error saving module setting:", error);
      setEnabled((prev) => ({ ...prev, [module.id]: !value }));
      toast.error(t("moduleSettings.saveError"));
    } finally {
      setSavingSlug(null);
    }
  };

  const getIconComponent = (iconName: string | null) => {
    if (!iconName) return LucideIcons.Circle;
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.Circle;
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={t("moduleSettings.seoTitle")}
        description={t("moduleSettings.seoDescription")}
      />
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
        <ManagementHeader className="flex items-center gap-3" title={t("moduleSettings.title")} as="div">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/family/${familySlug}`)}>
            <LucideIcons.ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {t("moduleSettings.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("moduleSettings.subtitle", { name: family?.name })}
            </p>
          </div>
        </ManagementHeader>

        {categories.map((category) => {
          const categoryModules = modules.filter(
            (m) => m.category_id === category.id,
          );
          if (categoryModules.length === 0) return null;
          return (
            <div key={category.id}>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                {category.name}
              </h2>
              <Card className="divide-y divide-border">
                {categoryModules.map((module) => {
                  const Icon = getIconComponent(module.icon);
                  const isOn = enabled[module.id] ?? true;
                  return (
                    <div
                      key={module.id}
                      className="flex items-center gap-4 p-4"
                    >
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{module.name}</p>
                        {module.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {module.description}
                          </p>
                        )}
                      </div>
                      <Switch
                        checked={isOn}
                        disabled={savingSlug === module.id}
                        onCheckedChange={(value) => toggleModule(module, value)}
                        aria-label={module.name}
                      />
                    </div>
                  );
                })}
              </Card>
            </div>
          );
        })}

        <p className="text-xs text-muted-foreground text-center">
          {t("moduleSettings.footerNote")}
        </p>
      </div>
    </div>
  );
}

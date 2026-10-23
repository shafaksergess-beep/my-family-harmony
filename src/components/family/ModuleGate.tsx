import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Route guard for family modules: when a family head/admin disables a
 * module in Module Settings, direct links to that module bounce back to
 * the family dashboard. Modules are enabled by default (no settings row).
 */
export function ModuleGate({
  moduleSlug,
  children,
}: {
  moduleSlug: string;
  children: ReactNode;
}) {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: family } = await supabase
        .from("families")
        .select("id")
        .eq("slug", familySlug)
        .maybeSingle();
      if (!family) {
        if (!cancelled) setAllowed(true);
        return;
      }
      const { data } = await supabase
        .from("family_module_settings")
        .select("is_enabled, modules:module_id (slug)")
        .eq("family_id", family.id)
        .eq("is_enabled", false);
      if (cancelled) return;
      const disabled = new Set(
        (data || [])
          .map((r: any) => r.modules?.slug as string | undefined)
          .filter(Boolean),
      );
      if (disabled.has(moduleSlug)) {
        toast.info(t("moduleSettings.moduleDisabled"));
        navigate(`/family/${familySlug}`, { replace: true });
        setAllowed(false);
      } else {
        setAllowed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [familySlug, moduleSlug, navigate, t]);

  if (allowed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  return allowed ? <>{children}</> : null;
}

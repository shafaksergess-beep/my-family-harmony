import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Per-family module activation. A module is enabled unless a
 * family_module_settings row explicitly disables it (default-on so
 * existing families keep every module).
 */
export function filterEnabledModules<T extends { slug: string }>(
  modules: T[],
  disabledSlugs: Set<string> | null,
): T[] {
  if (!disabledSlugs) return modules;
  return modules.filter((m) => !disabledSlugs.has(m.slug));
}

export function useFamilyModules(familyId?: string) {
  const [disabledSlugs, setDisabledSlugs] = useState<Set<string> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId) {
      setDisabledSlugs(new Set());
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("family_module_settings")
        .select("is_enabled, modules:module_id (slug)")
        .eq("family_id", familyId)
        .eq("is_enabled", false);
      if (cancelled) return;
      if (error) {
        console.error("Error loading family module settings:", error);
        setDisabledSlugs(new Set());
      } else {
        setDisabledSlugs(
          new Set(
            (data || [])
              .map((r: any) => r.modules?.slug as string | undefined)
              .filter(Boolean) as string[],
          ),
        );
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [familyId]);

  const isModuleEnabled = (slug: string) => !disabledSlugs?.has(slug);

  return { disabledSlugs, isModuleEnabled, loading };
}

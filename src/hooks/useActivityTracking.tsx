import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ActivityParams {
  actionType: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, any>;
  familyId?: string;
}

export const useActivityTracking = () => {
  const logActivity = async ({
    actionType,
    entityType,
    entityId,
    details,
    familyId,
  }: ActivityParams) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      await supabase.from("activity_logs").insert({
        user_id: session?.user?.id || null,
        family_id: familyId || null,
        action_type: actionType,
        entity_type: entityType || null,
        entity_id: entityId || null,
        details: details || null,
        ip_address: null, // Could be populated from an API
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  };

  // Log page view on mount
  useEffect(() => {
    logActivity({
      actionType: "page_view",
      details: { path: window.location.pathname },
    });
  }, []);

  return { logActivity };
};

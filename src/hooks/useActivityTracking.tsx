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
      // Use secure server-side logging function
      const { error } = await supabase.rpc('log_activity', {
        p_action_type: actionType,
        p_entity_type: entityType || null,
        p_entity_id: entityId || null,
        p_family_id: familyId || null,
        p_details: details || null,
      });

      if (error) throw error;
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

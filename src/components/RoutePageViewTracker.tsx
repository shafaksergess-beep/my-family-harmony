import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Mount once inside the router. Logs an activity row for every route change
 * for any authenticated user, so admin activity logs reflect real usage.
 */
export const RoutePageViewTracker = () => {
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || cancelled) return;
        await supabase.rpc("log_activity", {
          p_action_type: "page_view",
          p_entity_type: null,
          p_entity_id: null,
          p_family_id: null,
          p_details: { path: location.pathname + location.search },
        });
      } catch {
        /* swallow — analytics must never break the app */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search]);

  return null;
};

export default RoutePageViewTracker;

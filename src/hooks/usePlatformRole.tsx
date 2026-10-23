import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Platform-level roles: super admin (full control) and support admin
 * (read-mostly access for the support team). Both checks go through
 * security-definer RPCs — never client-side storage.
 */
export function usePlatformRole() {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isSupportAdmin, setIsSupportAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        if (!cancelled) setLoading(false);
        return;
      }
      const [superRes, supportRes] = await Promise.all([
        supabase.rpc("is_super_admin", { check_user_id: session.user.id }),
        supabase.rpc("is_support_admin", { check_user_id: session.user.id }),
      ]);
      if (cancelled) return;
      setIsSuperAdmin(!!superRes.data);
      setIsSupportAdmin(!!supportRes.data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    isSuperAdmin,
    isSupportAdmin,
    isPlatformStaff: isSuperAdmin || isSupportAdmin,
    loading,
  };
}

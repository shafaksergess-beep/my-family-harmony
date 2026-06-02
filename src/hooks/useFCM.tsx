import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { requestFcmToken, onForegroundMessage } from "@/lib/firebase";

/**
 * Hook to register the current user for Firebase Cloud Messaging push
 * notifications and persist the token on their profile.
 */
export function useFCM(userId?: string | null) {
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  const enable = useCallback(async () => {
    const t = await requestFcmToken();
    setPermission(
      typeof Notification !== "undefined" ? Notification.permission : "denied"
    );
    if (t) {
      setToken(t);
      if (userId) {
        const { error } = await supabase
          .from("profiles")
          .update({ push_token: t })
          .eq("id", userId);
        if (error) console.warn("[fcm] failed saving token", error);
      }
    }
    return t;
  }, [userId]);

  // Auto-attempt token retrieval if user has already granted permission
  useEffect(() => {
    if (!userId) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") {
      void enable();
    }
  }, [userId, enable]);

  // Foreground messages → optional in-app toast hookup point
  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      const fn = await onForegroundMessage((payload) => {
        console.log("[fcm] foreground message", payload);
      });
      if (typeof fn === "function") unsub = fn;
    })();
    return () => unsub?.();
  }, []);

  return { token, permission, enable };
}

export default useFCM;

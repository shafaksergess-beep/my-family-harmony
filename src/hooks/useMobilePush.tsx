import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { requestFcmToken } from "@/lib/firebase";

/**
 * Platform-aware push registration.
 *
 * - Native iOS/Android (Capacitor): uses @capacitor/push-notifications and
 *   stores the platform-native FCM/APNs token on profiles.push_token.
 * - Median.co wrappers: relies on the Median bridge if present, otherwise
 *   falls back to the web FCM token (works inside the in-app webview).
 * - Web/PWA: requests browser permission and registers a web FCM token.
 */
export function useMobilePush(userId?: string | null) {
  const [token, setToken] = useState<string | null>(null);
  const [platform, setPlatform] = useState<"native" | "median" | "web">("web");
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) setPlatform("native");
    else if (typeof window !== "undefined" && (window as any).median) setPlatform("median");
    else setPlatform("web");
  }, []);

  const persist = useCallback(
    async (t: string) => {
      setToken(t);
      if (!userId) return;
      const { error } = await supabase
        .from("profiles")
        .update({ push_token: t })
        .eq("id", userId);
      if (error) console.warn("[mobile-push] save failed", error);
    },
    [userId]
  );

  const enable = useCallback(async (): Promise<string | null> => {
    setEnabling(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        let perm = await PushNotifications.checkPermissions();
        if (perm.receive !== "granted") perm = await PushNotifications.requestPermissions();
        if (perm.receive !== "granted") return null;

        return await new Promise<string | null>((resolve) => {
          const regHandle = PushNotifications.addListener("registration", async (t) => {
            await persist(t.value);
            resolve(t.value);
            (await regHandle).remove();
          });
          PushNotifications.addListener("registrationError", (err) => {
            console.warn("[push] registration error", err);
            resolve(null);
          });
          PushNotifications.register();
        });
      }

      // Median bridge — best-effort token grab when running inside Median app
      if (platform === "median") {
        const median = (window as any).median;
        try {
          const t: string | undefined = await median?.onesignal?.getRegistrationId?.();
          if (t) {
            await persist(t);
            return t;
          }
        } catch (e) {
          console.warn("[median push] bridge unavailable, falling back to web", e);
        }
      }

      // Web / PWA fallback
      const webToken = await requestFcmToken();
      if (webToken) await persist(webToken);
      return webToken ?? null;
    } finally {
      setEnabling(false);
    }
  }, [persist, platform]);

  return { token, platform, enable, enabling };
}

export default useMobilePush;

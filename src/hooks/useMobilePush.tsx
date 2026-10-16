import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { requestFcmToken } from "@/lib/firebase";
import { incrementAppBadge } from "@/lib/appBadge";
import { checkIsNativelyApp, requestNativelyFcmToken } from "@/lib/natively";

/**
 * Platform-aware push registration.
 *
 * - Native iOS/Android (Capacitor): uses @capacitor-firebase/messaging.
 *   Tokens land in profiles.push_token; foreground notifications trigger
 *   a badge bump; taps deep-link via data.url.
 * - Natively wrappers: requests a native Firebase token (never a OneSignal ID).
 * - Web/PWA: browser Notification permission + web FCM token.
 */
export function useMobilePush(userId?: string | null) {
  const [token, setToken] = useState<string | null>(null);
  const [platform, setPlatform] = useState<"native" | "natively" | "web">("web");
  const [enabling, setEnabling] = useState(false);
  const badgeCountRef = useRef(0);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) setPlatform("native");
    else if (checkIsNativelyApp()) setPlatform("natively");
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

  // Wire native listeners once on mount so background tap deep-links + foreground
  // badge updates keep working after the first registration.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cleanup: Array<() => void> = [];

    (async () => {
      const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");

      const received = await FirebaseMessaging.addListener("notificationReceived", async () => {
        badgeCountRef.current += 1;
        await incrementAppBadge(badgeCountRef.current - 1);
      });
      cleanup.push(() => received.remove());

      const tapped = await FirebaseMessaging.addListener(
        "notificationActionPerformed",
        (evt) => {
          const url = (evt.notification.data as Record<string, string> | undefined)?.url;
          if (url && typeof window !== "undefined") {
            window.location.assign(url);
          }
        }
      );
      cleanup.push(() => tapped.remove());

      const rotated = await FirebaseMessaging.addListener("tokenReceived", async (evt) => {
        if (evt.token) await persist(evt.token);
      });
      cleanup.push(() => rotated.remove());
    })();

    return () => {
      cleanup.forEach((fn) => fn());
    };
  }, [persist]);

  const enable = useCallback(async (): Promise<string | null> => {
    setEnabling(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");
        let perm = await FirebaseMessaging.checkPermissions();
        if (perm.receive !== "granted") perm = await FirebaseMessaging.requestPermissions();
        if (perm.receive !== "granted") return null;

        const { token: t } = await FirebaseMessaging.getToken();
        if (t) await persist(t);
        return t ?? null;
      }

      if (checkIsNativelyApp()) {
        const nativeToken = await requestNativelyFcmToken();
        if (nativeToken) await persist(nativeToken);
        return nativeToken;
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

import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { shouldRegisterServiceWorker, unregisterAppServiceWorkers } from "@/lib/pwaRegister";

/**
 * Registers the service worker in safe contexts and prompts on updates.
 * In Lovable preview / iframes / dev, it refuses and unregisters any existing SW.
 */
export function PWAUpdatePrompt() {
  const [enabled] = useState(() => shouldRegisterServiceWorker());

  useEffect(() => {
    if (!enabled) {
      void unregisterAppServiceWorkers();
    }
  }, [enabled]);

  if (!enabled) return null;
  return <PWAUpdatePromptInner />;
}

function PWAUpdatePromptInner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl) {
      // eslint-disable-next-line no-console
      console.log("[PWA] Service worker registered:", swUrl);
    },
    onRegisterError(err) {
      // eslint-disable-next-line no-console
      console.warn("[PWA] Service worker registration error", err);
    },
  });

  useEffect(() => {
    if (offlineReady) {
      toast({
        title: "Ready to work offline",
        description: "Kinsroot is now available without an internet connection.",
      });
      setOfflineReady(false);
    }
  }, [offlineReady, setOfflineReady]);

  useEffect(() => {
    if (needRefresh) {
      toast({
        title: "Update available",
        description: "A new version of Kinsroot is ready.",
        duration: 10000,
        action: (
          <Button size="sm" onClick={() => updateServiceWorker(true)}>
            Reload
          </Button>
        ) as any,
      });
      setNeedRefresh(false);
    }
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
}

export default PWAUpdatePrompt;

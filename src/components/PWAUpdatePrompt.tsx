import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles, RotateCw } from "lucide-react";
import { shouldRegisterServiceWorker, unregisterAppServiceWorkers } from "@/lib/pwaRegister";

interface Changelog {
  version: string;
  releasedAt?: string;
  highlights: string[];
}

/**
 * Registers the service worker in safe contexts and prompts on updates.
 * On a new version:
 *   1. Toasts a quick "Update available" pill with a Reload button.
 *   2. Fetches /changelog.json and offers a dialog with what's new,
 *      then reloads WITHOUT losing route (the SW handles skipWaiting +
 *      clientsClaim; the reload just picks up the new bundle).
 */
export function PWAUpdatePrompt() {
  const [enabled] = useState(() => shouldRegisterServiceWorker());

  useEffect(() => {
    if (!enabled) void unregisterAppServiceWorkers();
  }, [enabled]);

  if (!enabled) return null;
  return <PWAUpdatePromptInner />;
}

function PWAUpdatePromptInner() {
  const [changelog, setChangelog] = useState<Changelog | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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
    if (!needRefresh) return;

    // Best-effort fetch of the release notes — cache-bust so the SW
    // doesn't serve the stale copy right at the moment of update.
    void fetch(`/changelog.json?ts=${Date.now()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((c: Changelog | null) => setChangelog(c));

    toast({
      title: "New version ready",
      description: "Refresh to apply the latest improvements.",
      duration: 12000,
      action: (
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          What's new
        </Button>
      ) as any,
    });
    setNeedRefresh(false);
  }, [needRefresh, setNeedRefresh]);

  const applyUpdate = () => {
    // updateServiceWorker(true) messages the waiting worker with SKIP_WAITING,
    // then reloads. With clientsClaim in the SW, the new bundle is served
    // on the very next request. Router state re-hydrates on the same URL.
    void updateServiceWorker(true);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {changelog?.version ? `What's new in v${changelog.version}` : "New version ready"}
          </DialogTitle>
          <DialogDescription>
            {changelog?.releasedAt
              ? `Released ${new Date(changelog.releasedAt).toLocaleDateString()}`
              : "A new version of Kinsroot is ready to install."}
          </DialogDescription>
        </DialogHeader>

        {changelog?.highlights?.length ? (
          <ul className="space-y-2 text-sm">
            {changelog.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Bug fixes and performance improvements.
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          Your current page will be preserved after reload.
        </p>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            Later
          </Button>
          <Button onClick={applyUpdate}>
            <RotateCw className="w-4 h-4 mr-2" />
            Reload now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PWAUpdatePrompt;

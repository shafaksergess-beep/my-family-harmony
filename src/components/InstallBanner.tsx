import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "kinsroot-install-banner-dismissed";

/**
 * Floating PWA install prompt — shows once per browser session
 * after `beforeinstallprompt` fires. Safe no-op in unsupported browsers.
 */
export const InstallBanner = () => {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY)) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  };

  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice;
    dismiss();
  };

  if (!open || !evt) return null;

  return (
    <Card className="fixed bottom-4 right-4 z-50 max-w-xs p-4 shadow-2xl border-primary/30 bg-card animate-fade-in">
      <button
        onClick={dismiss}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss install prompt"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3 pr-4">
        <div className="p-2 bg-primary/10 rounded-lg shrink-0">
          <Download className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-sm text-foreground mb-1">
            Install Kinsroot
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Add to your home screen for faster access and offline use.
          </p>
          <Button size="sm" onClick={install} className="w-full">
            Install app
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default InstallBanner;

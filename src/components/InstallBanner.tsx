import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Share, Plus, X } from "lucide-react";
import { Link } from "react-router-dom";
import {
  trackInstallOutcome,
  trackInstallPromptShown,
  trackAppInstalled,
} from "@/lib/pwaAnalytics";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "kinsroot-install-banner-dismissed-at";
const DISMISS_DAYS = 14;

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

function isIOSSafari(): boolean {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  // Chrome/Firefox/Edge on iOS report "CriOS"/"FxiOS"/"EdgiOS" — those can't install
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIOS && isSafari;
}

function wasRecentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (!at) return false;
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/**
 * Cross-platform install prompt.
 * - Android/Chromium: shows a native "Install" button once `beforeinstallprompt` fires.
 * - iOS Safari: shows Share → Add to Home Screen instructions.
 * - Dismissal persists for 14 days.
 */
export const InstallBanner = () => {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => wasRecentlyDismissed());
  const [standalone, setStandalone] = useState(() => isStandalone());
  const ios = useMemo(() => isIOSSafari(), []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      trackInstallPromptShown("android");
    };
    const installed = () => {
      setStandalone(true);
      trackAppInstalled("android");
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  // Track iOS banner exposure once when it becomes visible
  useEffect(() => {
    if (ios && !standalone && !dismissed) trackInstallPromptShown("ios");
  }, [ios, standalone, dismissed]);

  if (standalone || dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    trackInstallOutcome(outcome, "android");
    dismiss();
  };

  // iOS: show manual A2HS instructions
  if (ios) {
    return (
      <Card className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 sm:max-w-sm p-4 shadow-2xl border-primary/30 bg-card animate-fade-in">
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
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground mb-1">
              Install Kinsroot on your iPhone
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              Tap <Share className="inline w-3.5 h-3.5 mx-0.5 align-text-bottom" /> Share,
              then <Plus className="inline w-3.5 h-3.5 mx-0.5 align-text-bottom" />
              <span className="font-medium">&nbsp;Add to Home Screen</span>.
            </p>
            <Link to="/install" className="text-xs text-primary hover:underline">
              See full instructions →
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  // Android / desktop Chromium: needs the deferred prompt
  if (!evt) return null;

  return (
    <Card className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 sm:max-w-sm p-4 shadow-2xl border-primary/30 bg-card animate-fade-in">
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
          <p className="font-semibold text-sm text-foreground mb-1">Install Kinsroot</p>
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

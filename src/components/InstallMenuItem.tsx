import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { trackAppInstalled, trackInstallOutcome } from "@/lib/pwaAnalytics";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * A persistent "Install app" button suitable for a settings/profile menu.
 * - On Chromium: fires the deferred `beforeinstallprompt`.
 * - On iOS / when no prompt available: routes to `/install` for instructions.
 * - Shows an "Installed" state when the app is running in standalone mode.
 */
export function InstallMenuItem() {
  const navigate = useNavigate();
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandalone());

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    return (
      <Button variant="outline" className="w-full gap-2" disabled>
        <Check className="w-4 h-4" />
        App installed
      </Button>
    );
  }

  const handleClick = async () => {
    if (evt) {
      await evt.prompt();
      const { outcome } = await evt.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setEvt(null);
    } else {
      navigate("/install");
    }
  };

  return (
    <Button variant="outline" className="w-full gap-2" onClick={handleClick}>
      <Download className="w-4 h-4" />
      Install app
    </Button>
  );
}

export default InstallMenuItem;

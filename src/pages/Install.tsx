import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Download, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { haptics } from "@/lib/haptics";
import SEO from "@/components/SEO";

export default function Install() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Listen for the beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await haptics.medium();
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
      setIsInstallable(false);
      await haptics.success();
    }

    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-6 safe-area-inset">
      <SEO
        title="Install Kinsroot"
        description="Install the Kinsroot family management app on your phone for offline access, faster loading, and a home-screen icon."
      />
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-semibold leading-none tracking-tight">Install Kinsroot</h1>
          <h2 className="sr-only">Add Kinsroot to your home screen</h2>
          <p className="text-muted-foreground mt-2">
            Get the full app experience with offline access and faster loading
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {isInstalled ? (
            <div className="text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">App Installed!</h3>
                <p className="text-muted-foreground">
                  Kinsroot is now installed on your device
                </p>
              </div>
              <Button onClick={() => navigate("/dashboard")} className="w-full touch-target">
                Go to Dashboard
              </Button>
            </div>
          ) : isInstallable ? (
            <div className="space-y-4">
              <div className="bg-muted p-6 rounded-lg space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Benefits of Installing
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 text-green-600" />
                    <span>Works offline - Access your data without internet</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 text-green-600" />
                    <span>Faster loading - Instant startup times</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 text-green-600" />
                    <span>Home screen icon - Easy access like a native app</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 text-green-600" />
                    <span>No app store required - Install directly from browser</span>
                  </li>
                </ul>
              </div>

              <Button onClick={handleInstall} size="lg" className="w-full touch-target">
                <Download className="mr-2 h-5 w-5" />
                Install Now
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate("/dashboard")}
                className="w-full touch-target"
              >
                Continue in Browser
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted p-6 rounded-lg">
                <h3 className="font-semibold mb-3">Manual Installation</h3>
                <div className="space-y-4 text-sm text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground mb-1">On iPhone/iPad:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Tap the Share button in Safari</li>
                      <li>Scroll down and tap "Add to Home Screen"</li>
                      <li>Tap "Add" in the top right</li>
                    </ol>
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-1">On Android:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Tap the menu (three dots) in Chrome</li>
                      <li>Tap "Install app" or "Add to Home screen"</li>
                      <li>Tap "Install"</li>
                    </ol>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => navigate("/dashboard")}
                className="w-full touch-target"
              >
                Continue in Browser
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

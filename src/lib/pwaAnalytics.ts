import { logAnalyticsEvent } from "@/lib/firebase";

/**
 * Fire-and-forget PWA analytics helpers.
 * Uses Firebase Analytics (via `logAnalyticsEvent`) and de-duplicates
 * one-shot events per browser via localStorage.
 */

const ONCE_KEY = "kinsroot-pwa-analytics-once";

function onceGuard(key: string): boolean {
  try {
    const raw = localStorage.getItem(ONCE_KEY);
    const seen: Record<string, number> = raw ? JSON.parse(raw) : {};
    if (seen[key]) return false;
    seen[key] = Date.now();
    localStorage.setItem(ONCE_KEY, JSON.stringify(seen));
    return true;
  } catch {
    return true;
  }
}

export function trackInstallPromptShown(platform: "android" | "ios" | "desktop") {
  if (!onceGuard(`prompt_shown:${platform}`)) return;
  void logAnalyticsEvent("pwa_install_prompt_shown", { platform });
}

export function trackInstallOutcome(outcome: "accepted" | "dismissed", platform: string) {
  void logAnalyticsEvent(
    outcome === "accepted" ? "pwa_install_accepted" : "pwa_install_dismissed",
    { platform },
  );
}

export function trackAppInstalled(platform: string) {
  void logAnalyticsEvent("pwa_app_installed", { platform });
}

export function trackStandaloneLaunch() {
  if (!onceGuard(`standalone_launch:${new Date().toISOString().slice(0, 10)}`)) return;
  const displayMode = window.matchMedia("(display-mode: standalone)").matches
    ? "standalone"
    : (window.navigator as any).standalone === true
    ? "ios-standalone"
    : "browser";
  void logAnalyticsEvent("pwa_launch", { display_mode: displayMode });
}

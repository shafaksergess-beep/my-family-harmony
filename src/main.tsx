import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";
import "./lib/median"; // Initialize global isMedianApp
import { getAnalyticsSafe, logAnalyticsEvent } from "./lib/firebase";
import { trackStandaloneLaunch } from "./lib/pwaAnalytics";

// Service worker is managed by vite-plugin-pwa (autoUpdate mode)
// It automatically skips waiting and claims clients on new deployments

// Initialize Firebase Analytics (no-op if unsupported, e.g. in-app webviews)
void getAnalyticsSafe();

// Track PWA standalone launches once per day
trackStandaloneLaunch();

// Crashlytics-equivalent for web: forward JS errors → Analytics `exception` event
window.addEventListener("error", (e) => {
  void logAnalyticsEvent("exception", {
    description: `${e.message} @ ${e.filename}:${e.lineno}:${e.colno}`,
    fatal: false,
  });
});
window.addEventListener("unhandledrejection", (e) => {
  const reason = e.reason instanceof Error ? `${e.reason.name}: ${e.reason.message}` : String(e.reason);
  void logAnalyticsEvent("exception", { description: `unhandledrejection: ${reason}`, fatal: false });
});

const rootEl = document.getElementById("root")!;
// Remove the inline boot skeleton injected in index.html so React owns the tree
const boot = document.getElementById("ks-boot");
if (boot) boot.remove();

createRoot(rootEl).render(<App />);

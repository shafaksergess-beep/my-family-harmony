/**
 * PWA registration guard.
 * Returns true when it is safe to register a service worker in the current context.
 * When it returns false, it also proactively unregisters any existing `/sw.js`
 * so previously-cached previews don't keep serving stale HTML.
 */
export function shouldRegisterServiceWorker(): boolean {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;

  // Never register in dev
  if (!import.meta.env.PROD) return false;

  // Never register inside an iframe (Lovable editor preview)
  try {
    if (window.self !== window.top) return false;
  } catch {
    // Cross-origin iframe access throws — that itself means we're in an iframe
    return false;
  }

  const host = window.location.hostname;
  const isLovablePreviewHost =
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev");
  if (isLovablePreviewHost) return false;

  // Kill switch: append ?sw=off to any URL to unregister the SW
  if (new URLSearchParams(window.location.search).has("sw")) {
    if (new URLSearchParams(window.location.search).get("sw") === "off") {
      return false;
    }
  }

  return true;
}

/** Unregister any existing app service worker(s). Safe no-op if none. */
export async function unregisterAppServiceWorkers(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      regs
        .filter((r) => {
          const url = r.active?.scriptURL ?? r.installing?.scriptURL ?? r.waiting?.scriptURL ?? "";
          // Only touch the app SW paths — leave firebase-messaging-sw.js alone
          return url.endsWith("/sw.js") || url.endsWith("/service-worker.js");
        })
        .map((r) => r.unregister()),
    );
  } catch {
    // ignore
  }
}

import { NativelyInfo, NativelyClipboard, NativelyScanner, NativelyFirebaseNotifications, useNatively } from "natively";

export function checkIsNativelyApp() {
  return typeof window !== "undefined" && new NativelyInfo().browserInfo().isNativeApp;
}

export function nativeCallback<T>(invoke: (callback: (value: T, error?: { message?: string }) => void) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Native request timed out")), 20000);
    invoke((value, error) => {
      clearTimeout(timeout);
      if (error?.message) reject(new Error(error.message)); else resolve(value);
    });
  });
}

export async function requestNativelyFcmToken(): Promise<string | null> {
  if (!checkIsNativelyApp()) return null;
  const notifications = new NativelyFirebaseNotifications();
  await nativeCallback(callback => notifications.firebase_request_permission(callback));
  const result = await nativeCallback<{ token?: string }>(callback => notifications.firebase_get_token(callback));
  return typeof result?.token === "string" && result.token.length > 0 ? result.token : null;
}

export const nativelyBridge = {
  openPlayStore: (url: string) => {
    if (url !== 'market://details?id=com.softserge.kinsroot') return;
    const sdk = checkIsNativelyApp() ? useNatively() : undefined;
    if (sdk) sdk.openExternalApp(url);
    else window.location.assign(url);
  },
  sharePage: async (url: string, text?: string) => {
    if (checkIsNativelyApp()) useNatively()?.shareText([text, url].filter(Boolean).join("\n"));
    else if (navigator.share) await navigator.share({ url, text });
  },
  copyToClipboard: async (text: string) => {
    if (checkIsNativelyApp()) new NativelyClipboard().copy(text);
    else await navigator.clipboard.writeText(text);
  },
  scanBarcode: async () => {
    if (!checkIsNativelyApp()) return { success: false };
    const result = await nativeCallback<{ result?: string }>(cb => new NativelyScanner().showScanner(cb));
    return { success: Boolean(result?.result), code: result?.result };
  },
  openWindow: (url: string, external = false) => {
    const target = new URL(url, window.location.origin);
    if (!["https:", "http:"].includes(target.protocol)) return;
    if (external && checkIsNativelyApp()) useNatively()?.openExternalURL(target.href, true);
    else if (external) window.open(target.href, "_blank", "noopener,noreferrer");
    else window.location.assign(target.href);
  },
};
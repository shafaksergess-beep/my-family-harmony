import { Capacitor } from "@capacitor/core";

/**
 * Cross-platform app icon badge helper. No-op on unsupported platforms.
 */
export async function setAppBadge(count: number): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { Badge } = await import("@capawesome/capacitor-badge");
      await Badge.set({ count: Math.max(0, count) });
      return;
    }
    // Web / PWA badging API (Chromium)
    const nav = navigator as Navigator & {
      setAppBadge?: (count?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (count <= 0) {
      await nav.clearAppBadge?.();
    } else {
      await nav.setAppBadge?.(count);
    }
  } catch (e) {
    console.warn("[appBadge] set failed", e);
  }
}

export async function clearAppBadge(): Promise<void> {
  return setAppBadge(0);
}

export async function incrementAppBadge(current: number = 0): Promise<void> {
  return setAppBadge(current + 1);
}

import { describe, expect, it, vi } from "vitest";
vi.mock("natively", () => ({
  NativelyInfo: class { browserInfo() { return { isNativeApp: native }; } },
  NativelyFirebaseNotifications: class {
    firebase_request_permission(cb: (v: unknown) => void) { cb({ status: true }); }
    firebase_get_token(cb: (v: unknown) => void) { cb({ token: "firebase-native-token" }); }
  }, NativelyClipboard: class {}, NativelyScanner: class {}, useNatively: () => ({ openExternalApp, openExternalURL }),
}));
let native = false;
const openExternalApp = vi.fn();
const openExternalURL = vi.fn();
import { requestNativelyFcmToken, nativelyBridge } from "@/lib/natively";
describe("Natively Firebase adapter", () => {
  it("does not request native tokens in a browser", async () => {
    native = false; expect(await requestNativelyFcmToken()).toBeNull();
  });
  it("returns the native Firebase token, not a OneSignal identity", async () => {
    native = true; expect(await requestNativelyFcmToken()).toBe("firebase-native-token");
  });
  it("opens only Kinsroot's Android listing through the existing SDK", () => {
    native = true;
    openExternalApp.mockClear();
    nativelyBridge.openPlayStore('market://details?id=com.softserge.kinsroot');
    expect(openExternalApp).toHaveBeenCalledWith('market://details?id=com.softserge.kinsroot');
    nativelyBridge.openPlayStore('market://details?id=another.app');
    expect(openExternalApp).toHaveBeenCalledTimes(1);
    nativelyBridge.openWindow('https://play.google.com/store/apps/details?id=com.softserge.kinsroot', true);
    expect(openExternalURL).toHaveBeenCalledWith('https://play.google.com/store/apps/details?id=com.softserge.kinsroot', true);
  });
});
import { describe, expect, it, vi } from "vitest";
vi.mock("natively", () => ({
  NativelyInfo: class { browserInfo() { return { isNativeApp: native }; } },
  NativelyFirebaseNotifications: class {
    firebase_request_permission(cb: (v: unknown) => void) { cb({ status: true }); }
    firebase_get_token(cb: (v: unknown) => void) { cb({ token: "firebase-native-token" }); }
  }, NativelyClipboard: class {}, NativelyScanner: class {}, useNatively: () => ({}),
}));
let native = false;
import { requestNativelyFcmToken } from "@/lib/natively";
describe("Natively Firebase adapter", () => {
  it("does not request native tokens in a browser", async () => {
    native = false; expect(await requestNativelyFcmToken()).toBeNull();
  });
  it("returns the native Firebase token, not a OneSignal identity", async () => {
    native = true; expect(await requestNativelyFcmToken()).toBe("firebase-native-token");
  });
});
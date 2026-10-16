import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { NativelyInfo, useNatively } from "natively";
import { checkIsNativelyApp, nativelyBridge, requestNativelyFcmToken } from "@/lib/natively";

function useNativeBridge() {
  const [isReady, setReady] = useState(false);
  const [isNativeApp, setNative] = useState(checkIsNativelyApp);
  useEffect(() => {
    let mounted = true;
    const sdk = useNatively();
    if (checkIsNativelyApp()) sdk?.addObserver(() => {
      if (mounted) { setReady(true); setNative(true); }
    });
    return () => { mounted = false; };
  }, []);
  const info = new NativelyInfo().browserInfo();
  const platform = info.isIOSApp ? "ios" : info.isAndroidApp ? "android" : "browser";
  return { isReady, isNativeApp, platform, ...nativelyBridge, registerForPush: requestNativelyFcmToken };
}
const NativelyContext = createContext<ReturnType<typeof useNativeBridge> | null>(null);
export function NativelyProvider({ children }: { children: ReactNode }) {
  const bridge = useNativeBridge();
  return <NativelyContext.Provider value={bridge}>{children}</NativelyContext.Provider>;
}
export function useNativelyContext() {
  const context = useContext(NativelyContext);
  if (!context) throw new Error("useNativelyContext requires NativelyProvider");
  return context;
}
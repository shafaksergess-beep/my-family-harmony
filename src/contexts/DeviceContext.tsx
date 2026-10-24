import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { checkIsNativelyApp } from '@/lib/natively';

export interface DeviceInfo {
  isMobile: boolean; isTablet: boolean; isDesktop: boolean; isTouch: boolean;
  orientation: 'portrait' | 'landscape'; isStandalone: boolean; isNative: boolean; isIOS: boolean; isAndroid: boolean;
}
type DeviceWindow = Window & { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } };
export function readDevice(): DeviceInfo {
  if (typeof window === 'undefined') return { isMobile: false, isTablet: false, isDesktop: true, isTouch: false, orientation: 'landscape', isStandalone: false, isNative: false, isIOS: false, isAndroid: false };
  const w = window as DeviceWindow;
  const isNative = w.Capacitor?.isNativePlatform?.() === true || checkIsNativelyApp();
  const nativePlatform = w.Capacitor?.getPlatform?.();
  const ua = navigator.userAgent;
  const isMobile = isNative || window.matchMedia('(max-width: 767px)').matches;
  const isTablet = !isMobile && window.matchMedia('(min-width: 768px) and (max-width: 1023px)').matches;
  return { isMobile, isTablet, isDesktop: !isMobile && !isTablet,
    isTouch: window.matchMedia('(pointer: coarse)').matches,
    orientation: window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape',
    isStandalone: window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
    isNative, isIOS: nativePlatform === 'ios' || /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1),
    isAndroid: nativePlatform === 'android' || /Android/i.test(ua) };
}
export const DeviceContext = createContext<DeviceInfo | undefined>(undefined);
export function DeviceProvider({ children }: { children: ReactNode }) {
  const [device, setDevice] = useState(readDevice);
  const value = useMemo(() => device, [device]);
  useEffect(() => {
    const queries = ['(max-width: 767px)', '(min-width: 768px) and (max-width: 1023px)', '(pointer: coarse)', '(orientation: portrait)', '(display-mode: standalone)'].map(q => window.matchMedia(q));
    const update = () => setDevice(readDevice());
    queries.forEach(q => q.addEventListener('change', update));
    return () => queries.forEach(q => q.removeEventListener('change', update));
  }, []);
  useEffect(() => {
    document.documentElement.dataset.device = device.isMobile ? 'mobile' : device.isTablet ? 'tablet' : 'desktop';
    if (device.isNative) document.documentElement.dataset.native = 'true';
    else delete document.documentElement.dataset.native;
  }, [device]);
  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
}

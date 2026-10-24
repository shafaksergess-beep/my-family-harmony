import { useDevice } from './useDevice';
export type Platform = 'web' | 'ios' | 'android' | 'mobile-web';
export function usePlatform() {
  const d = useDevice();
  const platform: Platform = d.isNative ? (d.isIOS ? 'ios' : 'android') : d.isMobile ? 'mobile-web' : 'web';
  return { platform, isNative: d.isNative, isMobile: d.isMobile, isIOS: d.isIOS, isAndroid: d.isAndroid,
    isWeb: !d.isNative && !d.isMobile, isMobileWeb: !d.isNative && d.isMobile, isPWA: d.isStandalone,
    hasNotch: false, safeAreaTop: 0, safeAreaBottom: 0 };
}
export default usePlatform;

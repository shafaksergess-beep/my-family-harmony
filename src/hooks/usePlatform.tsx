import { useState, useEffect } from 'react';

export type Platform = 'web' | 'ios' | 'android' | 'mobile-web';

interface PlatformInfo {
  platform: Platform;
  isNative: boolean;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isWeb: boolean;
  isMobileWeb: boolean;
  isPWA: boolean;
  hasNotch: boolean;
  safeAreaTop: number;
  safeAreaBottom: number;
}

export function usePlatform(): PlatformInfo {
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>(() => detectPlatform());

  useEffect(() => {
    const handleResize = () => {
      setPlatformInfo(detectPlatform());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return platformInfo;
}

function detectPlatform(): PlatformInfo {
  const userAgent = navigator.userAgent.toLowerCase();
  const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
  const isAndroidDevice = /android/.test(userAgent);
  const isMobileDevice = isIOSDevice || isAndroidDevice || window.innerWidth < 768;
  
  // Check if running in Capacitor native shell
  const isCapacitor = !!(window as any).Capacitor?.isNativePlatform?.();
  
  // Check if PWA (installed to home screen)
  const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  // Detect platform
  let platform: Platform = 'web';
  if (isCapacitor) {
    platform = isIOSDevice ? 'ios' : 'android';
  } else if (isMobileDevice) {
    platform = 'mobile-web';
  }

  // Detect notch (iPhone X and later, some Android devices)
  const hasNotch = isIOSDevice && window.screen.height >= 812;
  
  // Safe area values (can be refined with CSS env() values)
  const safeAreaTop = hasNotch ? 44 : (isCapacitor ? 20 : 0);
  const safeAreaBottom = hasNotch ? 34 : (isCapacitor ? 0 : 0);

  return {
    platform,
    isNative: isCapacitor,
    isMobile: isMobileDevice || isCapacitor,
    isIOS: isIOSDevice,
    isAndroid: isAndroidDevice,
    isWeb: !isCapacitor && !isMobileDevice,
    isMobileWeb: !isCapacitor && isMobileDevice,
    isPWA,
    hasNotch,
    safeAreaTop,
    safeAreaBottom,
  };
}

export default usePlatform;

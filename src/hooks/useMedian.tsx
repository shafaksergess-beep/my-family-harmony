import { useEffect, useState, useCallback } from 'react';
import Median from 'median-js-bridge';

export interface MedianInfo {
  platform: 'ios' | 'android' | 'browser';
  isNativeApp: boolean;
  appId?: string;
  appVersion?: string;
  distribution?: string;
  language?: string;
  os?: string;
  model?: string;
}

export interface UseMedianReturn {
  isReady: boolean;
  isNativeApp: boolean;
  platform: 'ios' | 'android' | 'browser';
  deviceInfo: MedianInfo | null;
  // Navigation
  openWindow: (url: string, mode?: 'internal' | 'external' | 'appbrowser') => void;
  closeWindow: () => void;
  // Status Bar
  setStatusBar: (options: { style: 'auto' | 'light' | 'dark'; color: string; overlay?: boolean; blur?: boolean }) => void;
  // Share
  sharePage: (url: string, text?: string) => void;
  // Clipboard
  copyToClipboard: (data: string) => void;
  getFromClipboard: () => Promise<{ data: string }>;
  // OneSignal Push Notifications
  registerForPush: () => Promise<void>;
  // Tab Navigation
  selectTab: (tabIndex: number) => void;
  // Connectivity
  getConnectivity: () => Promise<{ connected: boolean; type: string }>;
  // Screen
  setScreenMode: (mode: 'auto' | 'light' | 'dark') => void;
  keepScreenOn: (enable: boolean) => void;
  // Webview
  clearCache: () => void;
  reloadWebview: () => void;
  // Barcode Scanner
  scanBarcode: () => Promise<{ success: boolean; code?: string; type?: string }>;
  // App Review
  promptAppReview: () => Promise<void>;
  // Device Info
  getDeviceInfo: () => Promise<MedianInfo>;
}

export function useMedian(): UseMedianReturn {
  const [isReady, setIsReady] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<MedianInfo | null>(null);

  useEffect(() => {
    // Check if Median is available (running in native app)
    const checkMedian = async () => {
      try {
        // Try to get device info to determine if we're in a native app
        const info = await Median.deviceInfo({});
        
        if (info && info.platform) {
          setIsReady(true);
          setDeviceInfo({
            platform: info.platform,
            isNativeApp: true,
            appId: info.appId,
            appVersion: info.appVersion,
            distribution: info.distribution,
            language: info.language,
            os: info.os,
            model: info.model,
          });
        } else {
          setDeviceInfo({
            platform: 'browser',
            isNativeApp: false,
          });
        }
      } catch (error) {
        console.log('Median not available (running in browser)');
        setDeviceInfo({
          platform: 'browser',
          isNativeApp: false,
        });
      }
    };

    checkMedian();
  }, []);

  const openWindow = useCallback((url: string, mode: 'internal' | 'external' | 'appbrowser' = 'internal') => {
    if (isReady) {
      Median.window.open(url, mode);
    } else {
      window.open(url, mode === 'internal' ? '_self' : '_blank');
    }
  }, [isReady]);

  const closeWindow = useCallback(() => {
    if (isReady) {
      Median.window.close();
    } else {
      window.close();
    }
  }, [isReady]);

  const setStatusBar = useCallback((options: { style: 'auto' | 'light' | 'dark'; color: string; overlay?: boolean; blur?: boolean }) => {
    if (isReady) {
      Median.statusbar.set({
        style: options.style,
        color: options.color,
        overlay: options.overlay ?? false,
        blur: options.blur ?? false,
      });
    }
  }, [isReady]);

  const sharePage = useCallback((url: string, text?: string) => {
    if (isReady) {
      Median.share.sharePage({ url, text });
    } else if (navigator.share) {
      navigator.share({ url, text });
    }
  }, [isReady]);

  const copyToClipboard = useCallback((data: string) => {
    if (isReady) {
      Median.clipboard.set({ data });
    } else {
      navigator.clipboard.writeText(data);
    }
  }, [isReady]);

  const getFromClipboard = useCallback(async (): Promise<{ data: string }> => {
    if (isReady) {
      return await Median.clipboard.get({});
    }
    const text = await navigator.clipboard.readText();
    return { data: text };
  }, [isReady]);

  const registerForPush = useCallback(async () => {
    if (isReady) {
      await Median.onesignal.register();
    }
  }, [isReady]);

  const selectTab = useCallback((tabIndex: number) => {
    if (isReady) {
      Median.tabNavigation.selectTab(tabIndex);
    }
  }, [isReady]);

  const getConnectivity = useCallback(async (): Promise<{ connected: boolean; type: string }> => {
    if (isReady) {
      const result = await Median.connectivity.get({});
      return { connected: result.connected === 1, type: result.type };
    }
    return { connected: navigator.onLine, type: 'unknown' };
  }, [isReady]);

  const setScreenMode = useCallback((mode: 'auto' | 'light' | 'dark') => {
    if (isReady) {
      Median.screen.setMode({ mode });
    }
  }, [isReady]);

  const keepScreenOn = useCallback((enable: boolean) => {
    if (isReady) {
      Median.screen.keepScreenOn({ enable });
    }
  }, [isReady]);

  const clearCache = useCallback(() => {
    if (isReady) {
      Median.webview.clearCache();
    }
  }, [isReady]);

  const reloadWebview = useCallback(() => {
    if (isReady) {
      Median.webview.reload();
    } else {
      window.location.reload();
    }
  }, [isReady]);

  const scanBarcode = useCallback(async (): Promise<{ success: boolean; code?: string; type?: string }> => {
    if (isReady) {
      return await Median.barcode.scan({});
    }
    return { success: false };
  }, [isReady]);

  const promptAppReview = useCallback(async () => {
    if (isReady) {
      await Median.appreview.prompt({});
    }
  }, [isReady]);

  const getDeviceInfo = useCallback(async (): Promise<MedianInfo> => {
    if (isReady) {
      const info = await Median.deviceInfo({});
      return {
        platform: info.platform as 'ios' | 'android',
        isNativeApp: true,
        appId: info.appId,
        appVersion: info.appVersion,
        distribution: info.distribution,
        language: info.language,
        os: info.os,
        model: info.model,
      };
    }
    return {
      platform: 'browser',
      isNativeApp: false,
    };
  }, [isReady]);

  return {
    isReady,
    isNativeApp: deviceInfo?.isNativeApp ?? false,
    platform: deviceInfo?.platform ?? 'browser',
    deviceInfo,
    openWindow,
    closeWindow,
    setStatusBar,
    sharePage,
    copyToClipboard,
    getFromClipboard,
    registerForPush,
    selectTab,
    getConnectivity,
    setScreenMode,
    keepScreenOn,
    clearCache,
    reloadWebview,
    scanBarcode,
    promptAppReview,
    getDeviceInfo,
  };
}

export default useMedian;

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import { DeviceProvider, readDevice } from '@/contexts/DeviceContext';
import { useDevice } from '@/hooks/useDevice';
import { usePlatform } from '@/hooks/usePlatform';
import { useIsMobile } from '@/hooks/use-mobile';

let width = 1280;
let portrait = true;
const listeners = new Set<() => void>();
function installMedia() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('max-width: 767') ? width < 768 : query.includes('min-width: 768') ? width >= 768 && width < 1024 : query.includes('orientation') ? portrait : false,
    media: query,
    addEventListener: (_event: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_event: string, fn: () => void) => listeners.delete(fn),
  }));
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); listeners.clear(); width = 1280; portrait = true; });
describe('device foundation', () => {
  it('classifies widths below 768 as mobile synchronously', () => {
    installMedia(); width = 767; expect(readDevice().isMobile).toBe(true);
    width = 768; expect(readDevice().isMobile).toBe(false); expect(readDevice().isTablet).toBe(true);
  });
  it('classifies 768 through 1023 as tablet and 1024 as desktop', () => {
    installMedia(); width = 1023; expect(readDevice().isTablet).toBe(true);
    width = 1024; expect(readDevice().isDesktop).toBe(true); expect(readDevice().isTablet).toBe(false);
  });
  it('classifies a Capacitor shell as mobile even at desktop width', () => {
    installMedia(); vi.stubGlobal('Capacitor', { isNativePlatform: () => true, getPlatform: () => 'ios' });
    expect(readDevice()).toMatchObject({ isNative: true, isMobile: true, isTablet: false, isDesktop: false, isIOS: true });
  });
  it('updates every compatibility hook from media listeners without resize', () => {
    installMedia(); width = 390;
    function Probe() {
      const device = useDevice(); const platform = usePlatform(); const mobile = useIsMobile();
      return <output>{[device.isMobile, platform.isMobile, mobile, device.orientation].join(':')}</output>;
    }
    const result = render(<DeviceProvider><Probe /></DeviceProvider>);
    expect(result.getByRole('status').textContent).toBe('true:true:true:portrait');
    expect(document.documentElement.dataset.device).toBe('mobile');
    act(() => { width = 1024; portrait = false; listeners.forEach(fn => fn()); });
    expect(result.getByRole('status').textContent).toBe('false:false:false:landscape');
    expect(document.documentElement.dataset.device).toBe('desktop');
    result.unmount(); expect(listeners.size).toBe(0);
  });
});
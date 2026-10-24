import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useDevice } from '@/hooks/useDevice';
import { ShellContext, type ShellConfig } from '@/hooks/useShellConfig';
import { ShellBottomNav } from './ShellBottomNav';
export function AppShell() {
  const { isMobile } = useDevice(); const location = useLocation();
  const [entries, setEntries] = useState<Record<string, ShellConfig>>({}); const [keyboardOpen, setKeyboardOpen] = useState(false); const [keyboardInset, setKeyboardInset] = useState(0);
  const register = useCallback((id: string, config: ShellConfig | null) => setEntries(prev => { const next = { ...prev }; if (config) next[id] = config; else delete next[id]; return next; }), []);
  const config = useMemo(() => Object.values(entries).reduce<ShellConfig>((result, value) => ({ ...result, ...value, hideBottomNav: result.hideBottomNav || value.hideBottomNav }), {}), [entries]);
  useEffect(() => {
    if (!isMobile) return;
    const viewport = window.visualViewport;
    const update = () => {
      const active = document.activeElement;
      const input = active instanceof HTMLElement && (active.matches('input, textarea, select') || active.isContentEditable);
      const inset = viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
      setKeyboardOpen(input); setKeyboardInset(input ? inset : 0);
    };
    const focus = () => requestAnimationFrame(update);
    document.addEventListener('focusin', focus); document.addEventListener('focusout', focus);
    viewport?.addEventListener('resize', update); viewport?.addEventListener('scroll', update);
    return () => { document.removeEventListener('focusin', focus); document.removeEventListener('focusout', focus); viewport?.removeEventListener('resize', update); viewport?.removeEventListener('scroll', update); };
  }, [isMobile]);
  const familySlug = /^\/family\/([^/]+)/.exec(location.pathname)?.[1];
  const checkIn = /\/meetings\/[^/]+\/checkin(?:\/|$)/.test(location.pathname);
  const hide = !!config.hideBottomNav || checkIn || keyboardOpen;
  const value = useMemo(() => ({ insideShell: true, keyboardOpen, config, register }), [keyboardOpen, config, register]);
  useEffect(() => {
    const section = location.hash.slice(1);
    if (!section) return;
    const scroll = () => { const target = document.getElementById(section); if (target) { target.scrollIntoView({ behavior: 'smooth' }); return true; } return false; };
    if (scroll()) return;
    const observer = new MutationObserver(() => { if (scroll()) observer.disconnect(); });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [location.pathname, location.hash]);
  return <ShellContext.Provider value={value}>{isMobile ? <div data-app-shell data-nav-visible={!hide} className="app-shell min-h-screen min-w-0 bg-background" style={{ '--keyboard-inset': `${keyboardInset}px` } as CSSProperties}>
    <div className="shell-content min-w-0"><Outlet /></div>
    {!hide && <ShellBottomNav familySlug={familySlug} admin={location.pathname.startsWith('/admin')} />}
  </div> : <Outlet />}</ShellContext.Provider>;
}

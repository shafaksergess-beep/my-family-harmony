// Pure helpers for the mobile shell bottom navigation dock.
export interface NavItemLike { key: string; path?: string; module?: string }

// Home/overview items only match exactly; other items also match their subroutes.
export function isItemActive(item: NavItemLike, pathname: string): boolean {
  if (!item.path) return false;
  if (pathname === item.path) return true;
  if (item.key === 'home' || item.key === 'overview') return false;
  return pathname.startsWith(item.path + '/');
}

// Module-gated items are hidden while modules load or when the module is disabled.
export function filterEnabledItems<T extends NavItemLike>(items: T[], isEnabled: (module: string) => boolean, loading: boolean): T[] {
  return items.filter(i => !i.module || (!loading && isEnabled(i.module)));
}

// Hide on scroll down, reveal on scroll up; always visible near the top and bottom.
export function nextNavHidden(current: boolean, y: number, lastY: number, docHeight: number, viewportH: number): boolean {
  if (y <= 8) return false;
  if (y + viewportH >= docHeight - 8) return false;
  if (y > lastY + 4) return true;
  if (y < lastY - 4) return false;
  return current;
}

export const INSTALL_URL = 'https://kinsroot.softserge.com/install';
export const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.softserge.kinsroot';
export const PLAY_MARKET_URL = 'market://details?id=com.softserge.kinsroot';
export const SUPPORT_EMAIL = 'softserge.dev@gmail.com';
export type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;
export function tourSeen(storage: PreferenceStorage, userId: string): boolean {
  if (!userId) return true;
  try { return storage.getItem(`kinsroot:tour-seen:${userId}`) === 'true'; } catch { return false; }
}
export function markTourSeen(storage: PreferenceStorage, userId: string): void {
  if (!userId) return;
  try { storage.setItem(`kinsroot:tour-seen:${userId}`, 'true'); } catch { /* Per-device persistence unavailable. */ }
}
export function isFinanceTour(roles: string[]): boolean {
  return roles.some(role => ['family_head', 'family_admin', 'treasurer'].includes(role));
}
export async function shareApp(text: string, api: { share?: (data: ShareData) => Promise<void>; copy: (text: string) => Promise<void> }): Promise<'shared' | 'copied' | 'cancelled'> {
  if (api.share) {
    try { await api.share({ title: 'Kinsroot', text, url: INSTALL_URL }); return 'shared'; }
    catch (error) { if (error instanceof Error && error.name === 'AbortError') return 'cancelled'; }
  }
  await api.copy(`${text}\n${INSTALL_URL}`);
  return 'copied';
}
export function canRateApp(isAndroid: boolean): boolean { return isAndroid; }
export function rateApp(api: { openMarket: (url: string) => void; openWeb: (url: string) => void; schedule: (callback: () => void) => void }): void {
  try { api.openMarket(PLAY_MARKET_URL); api.schedule(() => api.openWeb(PLAY_URL)); }
  catch { api.openWeb(PLAY_URL); }
}

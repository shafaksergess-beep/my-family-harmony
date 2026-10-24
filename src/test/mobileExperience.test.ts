import { describe, expect, it, vi } from 'vitest';
import { tourSeen, markTourSeen, shareApp, rateApp, canRateApp, isFinanceTour, INSTALL_URL, PLAY_URL, PLAY_MARKET_URL } from '@/lib/mobileExperience';
function storage() { const values = new Map<string, string>(); return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } }; }
describe('walkthrough seen preferences', () => {
  it('shows on first use and stays seen for that user after completion or skip', () => { const s = storage(); expect(tourSeen(s, 'one')).toBe(false); markTourSeen(s, 'one'); expect(tourSeen(s, 'one')).toBe(true); expect(tourSeen(s, 'two')).toBe(false); });
  it('does not mark a signed-out visitor', () => { const s = storage(); markTourSeen(s, ''); expect(tourSeen(s, '')).toBe(true); expect(tourSeen(s, 'one')).toBe(false); });
  it('continues when device storage is blocked', () => { const s = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } }; expect(tourSeen(s, 'one')).toBe(false); expect(() => markTourSeen(s, 'one')).not.toThrow(); });
  it('uses management guidance for heads, admins and treasurers only', () => { for (const role of ['family_head', 'family_admin', 'treasurer']) expect(isFinanceTour([role])).toBe(true); expect(isFinanceTour(['member'])).toBe(false); });
});
describe('share fallbacks', () => {
  it('shares the edited text and real install link', async () => { const share = vi.fn().mockResolvedValue(undefined); const copy = vi.fn(); expect(await shareApp('Edited invitation', { share, copy })).toBe('shared'); expect(share).toHaveBeenCalledWith({ title: 'Kinsroot', text: 'Edited invitation', url: 'https://kinsroot.softserge.com/install' }); expect(copy).not.toHaveBeenCalled(); });
  it('copies when sharing is unavailable or fails', async () => { for (const share of [undefined, vi.fn().mockRejectedValue(Error('unsupported'))]) { const copy = vi.fn().mockResolvedValue(undefined); expect(await shareApp('Join us', { share, copy })).toBe('copied'); expect(copy).toHaveBeenCalledWith(`Join us\n${INSTALL_URL}`); } });
  it('does not copy after cancellation', async () => { const error = new Error('cancel'); error.name = 'AbortError'; const copy = vi.fn(); expect(await shareApp('Join us', { share: vi.fn().mockRejectedValue(error), copy })).toBe('cancelled'); expect(copy).not.toHaveBeenCalled(); });
  it('surfaces copy failure for an error toast', async () => { await expect(shareApp('Join', { copy: vi.fn().mockRejectedValue(Error('blocked')) })).rejects.toThrow('blocked'); });
});
describe('rating availability and fallback', () => {
  it('only exposes rating on Android without an Apple listing', () => { expect(canRateApp(true)).toBe(true); expect(canRateApp(false)).toBe(false); });
  it('opens the exact package with a scheduled web fallback', () => { const openMarket = vi.fn(); const openWeb = vi.fn(); const schedule = vi.fn((callback: () => void) => callback()); rateApp({ openMarket, openWeb, schedule }); expect(openMarket).toHaveBeenCalledWith('market://details?id=com.softserge.kinsroot'); expect(openWeb).toHaveBeenCalledWith('https://play.google.com/store/apps/details?id=com.softserge.kinsroot'); });
  it('falls back immediately on a rejected scheme', () => { const openWeb = vi.fn(); rateApp({ openMarket: () => { throw Error('scheme'); }, openWeb, schedule: vi.fn() }); expect(openWeb).toHaveBeenCalledWith(PLAY_URL); expect(PLAY_MARKET_URL).toContain('com.softserge.kinsroot'); });
});

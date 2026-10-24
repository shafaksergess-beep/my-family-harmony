import { describe, it, expect } from 'vitest';
import { filterEnabledItems, isItemActive, nextNavHidden } from '@/lib/shellNav';

describe('shell bottom nav active state', () => {
  const home = { key: 'home', path: '/family/test' };
  const members = { key: 'members', path: '/family/test/members' };
  it('matches the exact path', () => {
    expect(isItemActive(members, '/family/test/members')).toBe(true);
    expect(isItemActive(members, '/family/test/contributions')).toBe(false);
  });
  it('matches subroutes for non-home items', () => {
    expect(isItemActive(members, '/family/test/members/abc')).toBe(true);
  });
  it('never subroute-matches home or overview', () => {
    expect(isItemActive(home, '/family/test/members')).toBe(false);
    expect(isItemActive({ key: 'overview', path: '/admin/dashboard' }, '/admin/dashboard/x')).toBe(false);
    expect(isItemActive(home, '/family/test')).toBe(true);
  });
  it('is inactive without a path', () => {
    expect(isItemActive({ key: 'more' }, '/family/test/more')).toBe(false);
  });
});

describe('shell bottom nav hide/show logic', () => {
  const doc = 3000, view = 844;
  it('hides when scrolling down and shows when scrolling up', () => {
    expect(nextNavHidden(false, 500, 400, doc, view)).toBe(true);
    expect(nextNavHidden(true, 400, 500, doc, view)).toBe(false);
  });
  it('always shows near the top and near the bottom', () => {
    expect(nextNavHidden(true, 0, 100, doc, view)).toBe(false);
    expect(nextNavHidden(true, 4, 100, doc, view)).toBe(false);
    expect(nextNavHidden(true, doc - view, doc - view - 50, doc, view)).toBe(false);
    expect(nextNavHidden(true, doc - view - 4, doc - view - 60, doc, view)).toBe(false);
  });
  it('ignores tiny deltas and keeps the current state', () => {
    expect(nextNavHidden(false, 502, 500, doc, view)).toBe(false);
    expect(nextNavHidden(true, 500, 502, doc, view)).toBe(true);
  });
});

describe('shell bottom nav module gating', () => {
  const items = [
    { key: 'home', path: '/f' },
    { key: 'meetings', path: '/f/meetings', module: 'meetings' },
    { key: 'finance', path: '/f/contributions', module: 'contributions' },
  ];
  it('hides module items while loading', () => {
    expect(filterEnabledItems(items, () => true, true).map(i => i.key)).toEqual(['home']);
  });
  it('hides disabled modules and keeps enabled ones', () => {
    const enabled = (m: string) => m === 'meetings';
    expect(filterEnabledItems(items, enabled, false).map(i => i.key)).toEqual(['home', 'meetings']);
  });
});

import { describe, it, expect } from 'vitest';
import { totalAlerts } from '@/lib/mobileAlerts';
describe('bell red dot', () => {
  it('stays off when nothing is new', () => { expect(totalAlerts({ unreadNotifications: 0, newMessages: 0, pendingDues: 0 })).toBe(0); });
  it('shows for a new message', () => { expect(totalAlerts({ unreadNotifications: 0, newMessages: 1, pendingDues: 0 })).toBe(1); });
  it('shows for dues', () => { expect(totalAlerts({ unreadNotifications: 0, newMessages: 0, pendingDues: 2 })).toBe(2); });
});

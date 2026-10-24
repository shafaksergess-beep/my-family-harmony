import { describe, expect, it } from 'vitest';
import { compactCategories, trendChange } from '@/lib/mobileAnalytics';
describe('mobile analytics data', () => {
  it('keeps six or fewer categories unchanged', () => {
    const rows = Array.from({ length: 6 }, (_, i) => ({ name: String(i), amount: i }));
    expect(compactCategories(rows, 'name', 'amount', 'Other')).toEqual(rows);
  });
  it('retains top five plus Other without losing totals', () => {
    const rows = Array.from({ length: 8 }, (_, i) => ({ name: String(i), amount: i + 1, count: 1 }));
    const result = compactCategories(rows, 'name', 'amount', 'Other');
    expect(result).toHaveLength(6);
    expect(result[5]).toEqual({ name: 'Other', amount: 6, count: 3 });
    expect(result.reduce((sum, row) => sum + row.amount, 0)).toBe(36);
    expect(rows[0].name).toBe('0');
  });
  it('reports concrete increases and decreases', () => {
    expect(trendChange(120, 100)).toBe(20);
    expect(trendChange(75, 100)).toBe(-25);
  });
  it('does not invent a percentage without a prior baseline', () => {
    expect(trendChange(100, 0)).toBeNull();
  });
});

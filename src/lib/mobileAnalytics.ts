/** Preserve totals while reducing dense category charts to five rows plus Other. */
export function compactCategories<T extends Record<string, unknown>>(rows: T[], labelKey: string, metricKey: string, otherLabel: string): T[] {
  if (rows.length <= 6) return rows;
  const sorted = [...rows].sort((a, b) => Number(b[metricKey] || 0) - Number(a[metricKey] || 0));
  const other: Record<string, unknown> = { ...sorted[5], [labelKey]: otherLabel };
  for (const key of Object.keys(other)) {
    if (typeof other[key] === 'number') other[key] = sorted.slice(5).reduce((sum, row) => sum + Number(row[key] || 0), 0);
  }
  return [...sorted.slice(0, 5), other as T];
}
export function trendChange(current: number, previous: number) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null;
  return (current - previous) / previous * 100;
}

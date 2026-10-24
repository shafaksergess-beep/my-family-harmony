import { Children, cloneElement, isValidElement, useState, type ReactNode, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Filter, X } from 'lucide-react';
import { Legend, Cell } from 'recharts';
import { useDevice } from '@/hooks/useDevice';
import { Button } from '@/components/ui/button';
import { StatCarousel } from '@/components/layout/StatCarousel';
import { BottomActionBar } from '@/components/layout/BottomActionBar';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription } from '@/components/ui/responsive-dialog';
import { compactCategories, trendChange } from '@/lib/mobileAnalytics';

export function AnalyticsFilters({ children, chips = [] }: { children: ReactNode; chips?: { key: string; label: string; clear: () => void }[] }) {
  const { isMobile } = useDevice(); const { t } = useTranslation(); const [open, setOpen] = useState(false);
  if (!isMobile) return <>{children}</>;
  return <><div className="snap-row flex min-w-0 items-center gap-2 overflow-x-auto pb-1"><Button variant="outline" size="sm" className="shrink-0 rounded-full" onClick={() => setOpen(true)}><Filter className="h-4 w-4" />{t('phase2.filters')}</Button>{chips.map(chip => <Button key={chip.key} variant="secondary" size="sm" className="max-w-full shrink-0 rounded-full" onClick={chip.clear}><span className="truncate">{chip.label}</span><X className="h-4 w-4 shrink-0" /></Button>)}</div><ResponsiveDialog open={open} onOpenChange={setOpen}><ResponsiveDialogContent><ResponsiveDialogHeader><ResponsiveDialogTitle>{t('phase2.filters')}</ResponsiveDialogTitle><ResponsiveDialogDescription>{t('phase2.filterDescription')}</ResponsiveDialogDescription></ResponsiveDialogHeader><div className="space-y-4 py-4 [&_button]:max-w-full [&_[role=combobox]]:w-full">{children}</div><BottomActionBar><Button onClick={() => setOpen(false)}>{t('phase2.done')}</Button></BottomActionBar></ResponsiveDialogContent></ResponsiveDialog></>;
}

// Retain the exact desktop KPI markup, and reuse its already-computed values on mobile.
function descendants(node: ReactNode): ReactElement<any>[] {
  return Children.toArray(node).flatMap(child => isValidElement(child) ? [child, ...descendants((child.props as any).children)] : []);
}
export function AnalyticsKpis({ children, className }: { children: ReactNode; className?: string }) {
  const { isMobile } = useDevice();
  if (!isMobile) return <div className={className}>{children}</div>;
  const cards = Children.toArray(children).filter(isValidElement);
  const items = cards.map((card, index) => {
    const nodes = descendants((card.props as any).children);
    const label = nodes.find(n => ['CardTitle'].includes((n.type as any).displayName)) ?? nodes.find(n => /text-sm/.test(n.props.className ?? ''));
    const value = nodes.find(n => /text-(2xl|3xl)/.test(n.props.className ?? ''));
    return { key: String(index), label: text(label?.props.children), value: value?.props.children ?? '', delta: undefined };
  });
  return <StatCarousel items={items} />;
}
function text(node: ReactNode): string { return Children.toArray(node).map(n => isValidElement(n) ? text((n.props as any).children) : typeof n === 'string' || typeof n === 'number' ? String(n) : '').join(''); }

export function AnalyticsSummary({ children, current, previous }: { children?: ReactNode; current?: number; previous?: number }) {
  const { isMobile } = useDevice(); const { t } = useTranslation();
  if (!isMobile) return null;
  const change = current !== undefined && previous !== undefined ? trendChange(current, previous) : null;
  return <p className="mb-3 min-w-0 break-words text-sm text-muted-foreground"><span className="font-semibold text-foreground">{t('phase2.summary')}: </span>{children ?? (change === null ? t('phase2.noComparison') : t(change >= 0 ? 'phase2.trendUp' : 'phase2.trendDown', { percent: Math.abs(change).toFixed(1) }))}</p>;
}

/** Recharts mobile adaptation only; desktop chart tree is unchanged. */
export function MobileChart({ children, summary }: { children: ReactElement<any>; summary?: ReactNode }) {
  const { isMobile } = useDevice(); const { t } = useTranslation();
  if (!isMobile) return children;
  const chart = Children.toArray(children.props.children).find(isValidElement) as ReactElement<any> | undefined;
  if (!chart) return children;
  const data = chart.props.data;
  const nested = Children.toArray(chart.props.children);
  const nameOf = (node: ReactElement<any>) => (node.type as any).displayName ?? (node.type as any).name ?? '';
  const x = nested.find(n => isValidElement(n) && nameOf(n) === 'XAxis') as ReactElement<any> | undefined;
  const series = nested.find(n => isValidElement(n) && ['Bar', 'Line', 'Area'].includes(nameOf(n))) as ReactElement<any> | undefined;
  const metric = typeof series?.props.dataKey === 'string' ? series.props.dataKey : undefined;
  const labelKey = typeof x?.props.dataKey === 'string' ? x.props.dataKey : undefined;
  // Chronological series retain all points, with fewer ticks. Categorical bars preserve totals.
  const categorical = labelKey && !['month', 'date'].includes(labelKey);
  const reduced = Array.isArray(data) && categorical && metric ? compactCategories(data, labelKey, metric, t('phase2.other')) : data;
  const adapted = nested.map(node => {
    if (!isValidElement<any>(node)) return node;
    const name = nameOf(node);
    if (name === 'XAxis') return cloneElement(node, { angle: 0, textAnchor: 'middle', height: 32, interval: 'preserveStartEnd', minTickGap: 30, tick: { fontSize: 10 }, tickFormatter: (v: unknown) => String(v).length > 12 ? String(v).slice(0, 10) + '…' : String(v) });
    if (name === 'YAxis') return cloneElement(node, { width: 42, tickCount: 4, tick: { fontSize: 10 }, tickFormatter: node.props.tickFormatter ?? ((v: number) => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(v)) });
    if (name === 'Legend') return cloneElement(node, { verticalAlign: 'bottom', wrapperStyle: { fontSize: 11 }, height: undefined });
    if (name === 'Tooltip' || name === 'ChartTooltip') return cloneElement(node, { trigger: 'click', wrapperStyle: { maxWidth: '100%', zIndex: 20 } });
    if (name === 'Pie') {
      const pieData = node.props.data;
      const key = node.props.nameKey ?? (pieData?.[0]?.status !== undefined ? 'status' : pieData?.[0]?.type !== undefined ? 'type' : 'name');
      const pieReduced = Array.isArray(pieData) ? compactCategories(pieData, key, node.props.dataKey, t('phase2.other')) : pieData;
      return cloneElement(node, { data: pieReduced, nameKey: key, label: false, labelLine: false, outerRadius: 65, innerRadius: node.props.innerRadius ? 35 : undefined }, pieReduced?.map((_: unknown, index: number) => <Cell key={index} fill={`hsl(var(--chart-${index % 5 + 1}))`} />));
    }
    return node;
  });
  const recordData = Array.isArray(data) ? data : nested.filter(isValidElement).find((n: any) => nameOf(n) === 'Pie')?.props.data;
  const fallbackSummary = categorical || hasRecordCategories(nested) ? t('phase2.recordsSummary', { count: recordData?.length ?? 0 }) : undefined;
  const last = Array.isArray(data) ? data[data.length - 1] : null; const prior = Array.isArray(data) ? data[data.length - 2] : null;
  const hasLegend = nested.some(node => isValidElement(node) && nameOf(node) === 'Legend');
  const hasPie = nested.some(node => isValidElement(node) && nameOf(node) === 'Pie');
  return <div className="w-full min-w-0"><AnalyticsSummary current={metric && last && !categorical ? Number(last[metric]) : undefined} previous={metric && prior && !categorical ? Number(prior[metric]) : undefined}>{summary ?? fallbackSummary}</AnalyticsSummary>{cloneElement(children, { height: 230, minWidth: 0 }, cloneElement(chart, { data: reduced, accessibilityLayer: true, margin: { top: 8, right: 4, bottom: 4, left: 0 } }, [...adapted, ...(!hasLegend && hasPie ? [<Legend key="mobile-legend" verticalAlign="bottom" wrapperStyle={{ fontSize: 11 }} />] : [])]))}</div>;
}

function hasRecordCategories(nodes: ReactNode[]) { return nodes.some(n => isValidElement(n) && ((n.type as any).displayName ?? (n.type as any).name) === "Pie"); }

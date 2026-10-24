import type { KeyboardEvent, ReactNode } from 'react';
import { MoreVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDevice } from '@/hooks/useDevice';
import { useCurrency } from '@/context/CurrencyContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
export interface DataColumn<T> { key: string; label: string; render: (row: T) => ReactNode; mobile?: boolean }
export interface DataCardsProps<T> {
  columns: DataColumn<T>[]; rows: T[]; getRowKey: (row: T) => string;
  title: (row: T) => ReactNode; subtitle?: (row: T) => ReactNode; status?: (row: T) => ReactNode;
  amount?: (row: T) => number; onRowClick?: (row: T) => void;
  actions?: (row: T) => { key: string; label: string; onClick: () => void; disabled?: boolean }[];
  emptyState?: ReactNode;
}
export function DataCards<T>({ columns, rows, getRowKey, title, subtitle, status, amount, onRowClick, actions, emptyState }: DataCardsProps<T>) {
  const { isMobile } = useDevice(); const { formatAmount } = useCurrency(); const { t } = useTranslation();
  const menu = (row: T) => {
    const options = actions?.(row); if (!options?.length) return null;
    return <DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label={t('foundation.moreActions')} onClick={e => e.stopPropagation()}><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{options.map(a => <DropdownMenuItem key={a.key} disabled={a.disabled} onClick={e => { e.stopPropagation(); a.onClick(); }}>{a.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>;
  };
  if (!rows.length) return <div className="py-8 text-center text-muted-foreground">{emptyState ?? t('foundation.noRecords')}</div>;
  if (!isMobile) return <Table><TableHeader><TableRow>{columns.map(c => <TableHead key={c.key}>{c.label}</TableHead>)}{actions && <TableHead>{t('foundation.actions')}</TableHead>}</TableRow></TableHeader><TableBody>{rows.map(row => <TableRow key={getRowKey(row)} onClick={() => onRowClick?.(row)}>{columns.map(c => <TableCell key={c.key}>{c.render(row)}</TableCell>)}{actions && <TableCell>{menu(row)}</TableCell>}</TableRow>)}</TableBody></Table>;
  return <div className="space-y-3">{rows.map(row => <Card key={getRowKey(row)} className="relative min-w-0 rounded-2xl p-4 active:bg-muted"
    {...(onRowClick ? { role: 'button' as const, tabIndex: 0, 'aria-label': t('foundation.openRecord'), onClick: () => onRowClick(row), onKeyDown: (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(row); } } } : {})}>
    <div className="relative flex min-w-0 items-start gap-2"><div className="min-w-0 flex-1"><div className="truncate font-semibold">{title(row)}</div>{subtitle && <div className="truncate text-sm text-muted-foreground">{subtitle(row)}</div>}</div><div className="shrink-0">{menu(row)}</div></div>
    <div className="relative mt-2 flex flex-wrap items-center justify-between gap-2">{status?.(row)}{amount && <span className="truncate font-semibold">{formatAmount(amount(row))}</span>}</div>
    <dl className="relative mt-3 space-y-2">{columns.filter(c => c.mobile !== false).map(c => <div key={c.key} className="flex min-w-0 justify-between gap-3 text-sm"><dt className="text-muted-foreground">{c.label}</dt><dd className="min-w-0 break-words text-right">{c.render(row)}</dd></div>)}</dl>
  </Card>)}</div>;
}

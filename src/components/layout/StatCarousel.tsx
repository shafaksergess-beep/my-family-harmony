import type { ComponentType, ReactNode } from 'react';
import { useDevice } from '@/hooks/useDevice';
import { Card } from '@/components/ui/card';
export interface StatItem { key: string; label: string; value: ReactNode; delta?: ReactNode; icon?: ComponentType<{ className?: string }> }
export function StatCarousel({ items }: { items: StatItem[] }) {
  const { isMobile } = useDevice();
  return <div className={isMobile ? 'snap-row flex min-w-0 gap-3 overflow-x-auto pb-2' : 'grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4'}>{items.map(item => <Card key={item.key} className={isMobile ? 'w-[78%] min-w-0 shrink-0 snap-start rounded-2xl p-4' : 'min-w-0 rounded-2xl p-4'}><div className="flex min-w-0 items-center gap-2"><p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{item.label}</p>{item.icon && <item.icon className="h-5 w-5 shrink-0 text-primary" />}</div><div className="mt-2 truncate text-2xl font-semibold">{item.value}</div>{item.delta && <div className="mt-1 truncate text-xs text-muted-foreground">{item.delta}</div>}</Card>)}</div>;
}

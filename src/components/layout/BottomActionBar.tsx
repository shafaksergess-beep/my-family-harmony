import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
export function BottomActionBar({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('bottom-action-bar flex flex-wrap justify-end gap-2 border-t border-border bg-background p-4', className)} {...props} />;
}

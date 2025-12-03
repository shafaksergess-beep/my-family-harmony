import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
}

export function PullToRefresh({
  pullDistance,
  isRefreshing,
  threshold = 80,
}: PullToRefreshProps) {
  const progress = Math.min(pullDistance / threshold, 1);
  const showIndicator = pullDistance > 10 || isRefreshing;

  if (!showIndicator) return null;

  return (
    <div
      className={cn(
        'absolute left-0 right-0 flex items-center justify-center',
        'transition-opacity duration-200',
        isRefreshing ? 'opacity-100' : ''
      )}
      style={{
        top: Math.min(pullDistance - 40, threshold - 40),
        opacity: isRefreshing ? 1 : progress,
      }}
    >
      <div
        className={cn(
          'h-10 w-10 rounded-full bg-card shadow-lg',
          'flex items-center justify-center',
          'border border-border'
        )}
      >
        <RefreshCw
          className={cn(
            'h-5 w-5 text-primary transition-transform',
            isRefreshing && 'animate-spin'
          )}
          style={{
            transform: isRefreshing
              ? undefined
              : `rotate(${progress * 360}deg)`,
          }}
        />
      </div>
    </div>
  );
}

export default PullToRefresh;

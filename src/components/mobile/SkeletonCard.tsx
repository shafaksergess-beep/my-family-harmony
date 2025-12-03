import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SkeletonCardProps {
  variant?: 'stat' | 'activity' | 'action' | 'family';
  className?: string;
}

export function SkeletonCard({ variant = 'stat', className }: SkeletonCardProps) {
  if (variant === 'stat') {
    return (
      <Card className={cn('p-4', className)}>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-12" />
          </div>
        </div>
      </Card>
    );
  }

  if (variant === 'activity') {
    return (
      <div className={cn('flex items-start gap-3 py-3', className)}>
        <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-3 w-12" />
      </div>
    );
  }

  if (variant === 'action') {
    return (
      <Card className={cn('p-4', className)}>
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <Skeleton className="h-3 w-16" />
        </div>
      </Card>
    );
  }

  if (variant === 'family') {
    return (
      <Card className={cn('p-4', className)}>
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </Card>
    );
  }

  return <Skeleton className={cn('h-20 w-full rounded-lg', className)} />;
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-4">
      {/* Family Selector Skeleton */}
      <SkeletonCard variant="family" />

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} variant="stat" />
        ))}
      </div>

      {/* Quick Actions Skeleton */}
      <div>
        <Skeleton className="h-5 w-24 mb-3" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} variant="action" />
          ))}
        </div>
      </div>

      {/* Activity Feed Skeleton */}
      <div>
        <Skeleton className="h-5 w-32 mb-3" />
        <Card className="divide-y divide-border">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="px-4">
              <SkeletonCard variant="activity" />
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

export default SkeletonCard;

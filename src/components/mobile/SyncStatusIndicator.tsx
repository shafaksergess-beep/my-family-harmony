import { Cloud, CloudOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSyncQueue } from '@/hooks/useOfflineData';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface SyncStatusIndicatorProps {
  className?: string;
}

export function SyncStatusIndicator({ className }: SyncStatusIndicatorProps) {
  const { isOnline, pendingCount, failedCount, isSyncing, sync } = useSyncQueue();

  const hasIssues = failedCount > 0;
  const hasPending = pendingCount > 0;

  if (isOnline && !hasPending && !hasIssues) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'relative h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10',
            !isOnline && 'text-primary-foreground/70',
            hasIssues && 'text-yellow-300',
            className
          )}
        >
          {isSyncing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : !isOnline ? (
            <CloudOff className="h-4 w-4" />
          ) : hasIssues ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <Cloud className="h-4 w-4" />
          )}
          
          {(hasPending || hasIssues) && (
            <span className={cn(
              'absolute -top-1 -right-1 h-4 w-4 rounded-full text-[10px] font-medium flex items-center justify-center',
              hasIssues ? 'bg-yellow-500 text-yellow-950' : 'bg-secondary text-secondary-foreground'
            )}>
              {pendingCount + failedCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-64 p-3" align="end">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Cloud className="h-4 w-4 text-green-500" />
            ) : (
              <CloudOff className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {hasPending && (
            <div className="text-sm text-muted-foreground">
              {pendingCount} change{pendingCount !== 1 ? 's' : ''} pending sync
            </div>
          )}

          {hasIssues && (
            <div className="text-sm text-destructive">
              {failedCount} change{failedCount !== 1 ? 's' : ''} failed to sync
            </div>
          )}

          {isOnline && (hasPending || hasIssues) && (
            <Button
              size="sm"
              className="w-full"
              onClick={sync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Now
                </>
              )}
            </Button>
          )}

          {!isOnline && (
            <p className="text-xs text-muted-foreground">
              Your changes are saved locally and will sync when you're back online.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default SyncStatusIndicator;

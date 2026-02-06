import { useState, useEffect, useCallback } from 'react';
import { backgroundSync, SyncStatus } from '@/lib/backgroundSync';

/**
 * Hook to access and control background sync functionality
 * Provides sync status, manual sync trigger, and auto-sync control
 */
export function useBackgroundSync() {
  const [status, setStatus] = useState<SyncStatus>(backgroundSync.getStatus());

  useEffect(() => {
    const unsubscribe = backgroundSync.subscribe(setStatus);
    return unsubscribe;
  }, []);

  const sync = useCallback(async () => {
    return backgroundSync.sync();
  }, []);

  const startAutoSync = useCallback((intervalMs?: number) => {
    backgroundSync.scheduleSync(intervalMs);
  }, []);

  const stopAutoSync = useCallback(() => {
    backgroundSync.stopAutoSync();
  }, []);

  return {
    ...status,
    sync,
    startAutoSync,
    stopAutoSync,
  };
}

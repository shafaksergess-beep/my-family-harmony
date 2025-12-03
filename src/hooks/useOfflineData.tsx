import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, QueryKey } from '@tanstack/react-query';
import { offlineStorage } from '@/lib/offlineStorage';
import { syncQueue, SyncOperation } from '@/lib/syncQueue';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { toast } from '@/hooks/use-toast';

interface UseOfflineQueryOptions<T> {
  queryKey: QueryKey;
  queryFn: () => Promise<T>;
  familyId?: string;
  staleTime?: number;
  cacheTime?: number;
}

export function useOfflineQuery<T>({
  queryKey,
  queryFn,
  familyId,
  staleTime = 5 * 60 * 1000, // 5 minutes
  cacheTime = 24 * 60 * 60 * 1000, // 24 hours
}: UseOfflineQueryOptions<T>) {
  const { isOnline } = useOnlineStatus();
  const cacheKey = JSON.stringify(queryKey);
  const [cachedData, setCachedData] = useState<T | null>(null);

  // Load from cache on mount
  useEffect(() => {
    offlineStorage.get<T>(cacheKey).then(data => {
      if (data) setCachedData(data);
    });
  }, [cacheKey]);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!isOnline) {
        const cached = await offlineStorage.get<T>(cacheKey);
        if (cached) return cached;
        throw new Error('No cached data available offline');
      }

      const data = await queryFn();
      // Cache the result
      await offlineStorage.set(cacheKey, data, familyId);
      return data;
    },
    staleTime,
    gcTime: cacheTime,
    // Use cached data as initial data
    initialData: cachedData ?? undefined,
    // Retry only when online
    retry: isOnline ? 3 : 0,
  });

  return {
    ...query,
    isOffline: !isOnline,
    isCached: !!cachedData && !isOnline,
  };
}

interface UseOfflineMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  table: string;
  primaryKey?: string;
  operationType: SyncOperation['type'];
  familyId?: string;
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
  invalidateKeys?: QueryKey[];
}

export function useOfflineMutation<TData, TVariables extends Record<string, unknown>>({
  mutationFn,
  table,
  primaryKey = 'id',
  operationType,
  familyId,
  onSuccess,
  onError,
  invalidateKeys = [],
}: UseOfflineMutationOptions<TData, TVariables>) {
  const { isOnline } = useOnlineStatus();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      if (isOnline) {
        return mutationFn(variables);
      }

      // Queue for later sync
      await syncQueue.add({
        type: operationType,
        table,
        data: variables,
        primaryKey,
        familyId,
      });

      toast({
        title: "Saved offline",
        description: "Your changes will sync when you're back online.",
      });

      // Return optimistic data
      return variables as unknown as TData;
    },
    onSuccess: (data) => {
      // Invalidate related queries
      invalidateKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      onSuccess?.(data);
    },
    onError: (error: Error) => {
      onError?.(error);
    },
  });
}

export function useSyncQueue() {
  const [queue, setQueue] = useState<SyncOperation[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const { isOnline } = useOnlineStatus();

  useEffect(() => {
    // Load initial queue
    syncQueue.getAll().then(setQueue);

    // Subscribe to queue changes
    const unsubscribe = syncQueue.subscribe(setQueue);
    return unsubscribe;
  }, []);

  const sync = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      const result = await syncQueue.processQueue();
      
      if (result.success > 0) {
        toast({
          title: "Sync complete",
          description: `${result.success} changes synced successfully.`,
        });
      }
      
      if (result.failed > 0) {
        toast({
          title: "Some changes failed to sync",
          description: `${result.failed} changes could not be synced.`,
          variant: "destructive",
        });
      }
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && queue.some(op => op.status === 'pending')) {
      sync();
    }
  }, [isOnline, queue, sync]);

  return {
    queue,
    pendingCount: queue.filter(op => op.status === 'pending').length,
    failedCount: queue.filter(op => op.status === 'failed').length,
    isSyncing,
    sync,
    isOnline,
  };
}

export function useCacheManager() {
  const clearCache = useCallback(async (familyId?: string) => {
    if (familyId) {
      await offlineStorage.clearByFamily(familyId);
    } else {
      await offlineStorage.clearExpired(0); // Clear all
    }
  }, []);

  const clearExpiredCache = useCallback(async () => {
    await offlineStorage.clearExpired();
  }, []);

  return {
    clearCache,
    clearExpiredCache,
  };
}

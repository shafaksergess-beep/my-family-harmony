// Offline-friendly caching layer for Supabase realtime updates.
//
// Wraps postgres_changes subscriptions so INSERT/UPDATE/DELETE events
// patch (a) the IndexedDB offline cache and (b) the React Query cache.
// The result: dashboards stay consistent after a refresh or a brief
// connectivity loss — the cached array already contains realtime deltas
// that arrived while the tab was open, and refetch merges cleanly.

import { QueryClient, QueryKey } from "@tanstack/react-query";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { offlineStorage } from "@/lib/offlineStorage";

type Row = Record<string, any>;

export interface RealtimeCacheOptions {
  /** Postgres table name (public schema). */
  table: string;
  /** Optional server-side filter, e.g. `family_id=eq.<uuid>`. */
  filter?: string;
  /** React Query key whose cached array should be patched. */
  queryKey: QueryKey;
  /** IndexedDB cache key (usually mirrors queryKey). */
  cacheKey?: string;
  /** Owning family id — scopes the offline cache entry. */
  familyId?: string;
  /** Primary key column, default "id". */
  primaryKey?: string;
  /** React Query client to keep in sync. */
  queryClient: QueryClient;
  /** Optional channel name (default: `rt-${table}-${filter}`). */
  channelName?: string;
}

function applyDelta<T extends Row>(
  list: T[] | undefined,
  payload: RealtimePostgresChangesPayload<T>,
  pk: string,
): T[] {
  const arr = Array.isArray(list) ? [...list] : [];
  const { eventType, new: newRow, old: oldRow } = payload;
  const targetId = (newRow as Row)?.[pk] ?? (oldRow as Row)?.[pk];

  if (eventType === "INSERT" && newRow) {
    if (targetId && arr.some((r) => (r as Row)[pk] === targetId)) return arr;
    return [newRow as T, ...arr];
  }
  if (eventType === "UPDATE" && newRow) {
    const idx = arr.findIndex((r) => (r as Row)[pk] === targetId);
    if (idx === -1) return [newRow as T, ...arr];
    const next = arr.slice();
    next[idx] = { ...(next[idx] as Row), ...(newRow as Row) } as T;
    return next;
  }
  if (eventType === "DELETE") {
    return arr.filter((r) => (r as Row)[pk] !== targetId);
  }
  return arr;
}

/**
 * Subscribe to a Supabase table and mirror deltas into React Query + IndexedDB.
 * Returns an unsubscribe function; call it from a useEffect cleanup.
 */
export function subscribeRealtimeCache<T extends Row = Row>(
  opts: RealtimeCacheOptions,
): () => void {
  const {
    table,
    filter,
    queryKey,
    cacheKey = JSON.stringify(queryKey),
    familyId,
    primaryKey = "id",
    queryClient,
    channelName = `rt-${table}-${filter ?? "all"}`,
  } = opts;

  const channel: RealtimeChannel = supabase
    .channel(channelName)
    .on(
      // @ts-expect-error — supabase-js typing quirk for postgres_changes
      "postgres_changes",
      { event: "*", schema: "public", table, ...(filter ? { filter } : {}) },
      async (payload: RealtimePostgresChangesPayload<T>) => {
        // 1. Patch React Query cache in place.
        queryClient.setQueryData<T[]>(queryKey, (prev) =>
          applyDelta<T>(prev, payload, primaryKey),
        );

        // 2. Patch IndexedDB so a refresh keeps the same view.
        try {
          const cached = await offlineStorage.get<T[]>(cacheKey);
          const next = applyDelta<T>(cached ?? undefined, payload, primaryKey);
          await offlineStorage.set(cacheKey, next, familyId);
        } catch {
          /* non-fatal */
        }
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

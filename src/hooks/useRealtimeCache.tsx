import { useEffect } from "react";
import { useQueryClient, QueryKey } from "@tanstack/react-query";
import { subscribeRealtimeCache } from "@/lib/realtimeCache";

/**
 * React hook wrapper around subscribeRealtimeCache.
 *
 * Example:
 *   useRealtimeCache({
 *     table: "contributions",
 *     filter: `family_id=eq.${familyId}`,
 *     queryKey: ["contributions", familyId],
 *     familyId,
 *   });
 */
export function useRealtimeCache(opts: {
  table: string;
  filter?: string;
  queryKey: QueryKey;
  familyId?: string;
  primaryKey?: string;
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const { enabled = true, ...rest } = opts;
  // Stringify keys so effect only re-runs on meaningful changes.
  const keySig = JSON.stringify(rest.queryKey);

  useEffect(() => {
    if (!enabled) return;
    const unsub = subscribeRealtimeCache({ ...rest, queryClient });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, rest.table, rest.filter, keySig, rest.familyId, queryClient]);
}

export default useRealtimeCache;

import { useEffect } from "react";
import { backgroundSync } from "@/lib/backgroundSync";
import { offlineStorage } from "@/lib/offlineStorage";

/**
 * Boots background sync on app start, periodically retries the queue,
 * and prunes expired offline cache entries.
 */
export function OfflineBootstrap() {
  useEffect(() => {
    // Start auto-sync every 60s. When offline, the service no-ops and
    // resumes automatically once the `online` event fires.
    backgroundSync.scheduleSync(60_000);

    // Clean expired offline cache once on startup.
    offlineStorage.clearExpired().catch(() => {
      /* non-fatal */
    });

    return () => {
      backgroundSync.stopAutoSync();
    };
  }, []);

  return null;
}

export default OfflineBootstrap;

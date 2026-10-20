import { supabase } from "@/integrations/supabase/client";

export type ManagedSession = {
  id: string;
  created_at: string;
  updated_at: string | null;
  not_after: string | null;
  user_agent: string | null;
  device_label: string;
  ip_address: string | null;
  last_seen_at: string;
  is_current: boolean;
};

async function invoke(action: string, extra: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("session-management", {
    body: { action, ...extra },
  });
  if (error) throw error;
  return data;
}

export const sessionManager = {
  async recordCurrent() {
    try { await invoke("record"); } catch (e) { console.warn("record session failed", e); }
  },
  async list(): Promise<{ sessions: ManagedSession[] }> {
    return await invoke("list");
  },
  async revokeOthers() {
    return await invoke("revoke-others");
  },
};

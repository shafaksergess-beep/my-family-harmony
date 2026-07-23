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

function getCurrentSessionId(): string | undefined {
  // Supabase session JWTs contain a `session_id` claim.
  try {
    const raw = localStorage.getItem(
      Object.keys(localStorage).find((k) => k.startsWith("sb-") && k.endsWith("-auth-token")) ?? ""
    );
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    const token: string | undefined = parsed?.access_token;
    if (!token) return undefined;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.session_id;
  } catch {
    return undefined;
  }
}

async function invoke(action: string, extra: Record<string, unknown> = {}) {
  const currentSessionId = getCurrentSessionId();
  const { data, error } = await supabase.functions.invoke("session-management", {
    body: { action, currentSessionId, ...extra },
  });
  if (error) throw error;
  return data;
}

export const sessionManager = {
  getCurrentSessionId,
  async recordCurrent() {
    const sid = getCurrentSessionId();
    if (!sid) return;
    try { await invoke("record", { sessionId: sid }); } catch (e) { console.warn("record session failed", e); }
  },
  async enforceLimit() {
    try { return await invoke("enforce-limit"); } catch (e) { console.warn("enforce limit failed", e); }
  },
  async list(): Promise<{ sessions: ManagedSession[]; max: number }> {
    return await invoke("list");
  },
  async revoke(sessionId: string) {
    return await invoke("revoke", { sessionId });
  },
  async revokeOthers() {
    return await invoke("revoke-others");
  },
};

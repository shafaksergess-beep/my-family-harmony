import { supabase } from '@/integrations/supabase/client';

export const chatSeenKey = (familyId: string) => `kinsroot:chatSeen:${familyId}`;

export function markChatSeen(familyId: string) {
  try { localStorage.setItem(chatSeenKey(familyId), new Date().toISOString()); } catch { /* ignore */ }
}

export interface AlertCounts { unreadNotifications: number; newMessages: number; pendingDues: number; }

/** The red dot shows only when there is something real: unread alerts, new messages or dues. */
export function totalAlerts(c: AlertCounts): number {
  return Math.max(0, c.unreadNotifications) + Math.max(0, c.newMessages) + Math.max(0, c.pendingDues);
}

export async function fetchAlertCounts(familyId: string, userId: string, memberId: string | null, pendingDues: number): Promise<AlertCounts> {
  const { count: unread } = await supabase
    .from('in_app_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)
    .or(`family_id.eq.${familyId},family_id.is.null`);

  let seen: string | null = null;
  try { seen = localStorage.getItem(chatSeenKey(familyId)); } catch { /* ignore */ }
  // First visit: only count messages from the last 7 days.
  const since = seen ?? new Date(Date.now() - 7 * 86400000).toISOString();
  let q = supabase
    .from('chat_messages')
    .select('id', { count: 'exact', head: true })
    .eq('family_id', familyId)
    .gt('created_at', since);
  if (memberId) q = q.neq('sender_id', memberId);
  const { count: msgs } = await q;

  return { unreadNotifications: unread ?? 0, newMessages: msgs ?? 0, pendingDues };
}

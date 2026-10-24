/** Preserve the Members screen's existing management and self-action restrictions. */
export function canShowMemberActions(canManageMembers: boolean, memberUserId: string, currentUserId: string | null) {
  return canManageMembers && memberUserId !== currentUserId;
}
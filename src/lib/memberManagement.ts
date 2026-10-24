/** Preserve the Members screen's existing management and self-action restrictions. */
export function canShowMemberActions(canManageMembers: boolean, memberUserId: string, currentUserId: string | null) {
  return canManageMembers && memberUserId !== currentUserId;
}

/** null means all RLS-visible profiles; an empty array means no managed users. */
export function adminUserProfileIds(isSuperAdmin: boolean, memberships: { user_id: string; family_id: string }[], managedFamilies: string[]): string[] | null {
  if (isSuperAdmin) return null;
  return [...new Set(memberships.filter(m => managedFamilies.includes(m.family_id)).map(m => m.user_id))];
}

export function matchesAdminUserSearch(user: { full_name: string | null; email: string | null; phone: string | null; families: { family: { name: string } | null }[] }, search: string): boolean {
  const query = search.trim().toLocaleLowerCase();
  return [user.full_name, user.email, user.phone, ...user.families.map(m => m.family?.name)]
    .some(value => (value ?? "").toLocaleLowerCase().includes(query));
}
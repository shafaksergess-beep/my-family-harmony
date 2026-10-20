export function currentSessionId(claims: Record<string, unknown>): string | undefined {
  const sid = claims.session_id;
  return typeof sid === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sid) ? sid : undefined;
}

export async function revokeOtherSessions(
  signOut: (jwt: string, scope: "others") => Promise<{ error: unknown }>,
  jwt: string,
): Promise<void> {
  const { error } = await signOut(jwt, "others");
  if (error) throw error;
}

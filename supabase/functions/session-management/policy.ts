import { z } from "npm:zod@3";

export const requestSchema = z.object({
  action: z.enum(["list", "record", "revoke-others"]),
  currentSessionId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
}).strict();

export function currentSessionId(claims: Record<string, unknown>): string | undefined {
  const parsed = z.string().uuid().safeParse(claims.session_id);
  return parsed.success ? parsed.data : undefined;
}

export async function revokeOtherSessions(
  signOut: (jwt: string, scope: "others") => Promise<{ error: unknown }>,
  jwt: string,
): Promise<void> {
  const { error } = await signOut(jwt, "others");
  if (error) throw error;
}
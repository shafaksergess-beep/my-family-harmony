export function deletionPolicy(method: string, body: unknown, signedInAt?: string, now = Date.now()) {
  if (method !== "POST") return "method";
  if (!body || typeof body !== "object" || (body as { confirmation?: unknown }).confirmation !== "DELETE") return "confirmation";
  const age = now - Date.parse(signedInAt ?? "");
  if (!Number.isFinite(age) || age < 0 || age > 15 * 60 * 1000) return "reauth";
  return null;
}
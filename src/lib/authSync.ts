import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

/**
 * Ensure a public.profiles row exists for the current auth user and is
 * populated with the latest info from their identity provider (Google, Apple,
 * email). Safe to call on every sign-in — uses UPSERT.
 *
 * The DB trigger `handle_new_user` creates the initial row, but this covers:
 *  - Users created before OAuth was enabled
 *  - Refreshing avatar / name when a linked provider updates it
 *  - Ensuring email stays in sync after email-change or provider linking
 */
export async function syncUserProfile(user: User) {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const identity = user.identities?.[0]?.identity_data as
    | Record<string, unknown>
    | undefined;

  const pick = (key: string): string | undefined => {
    const v = meta[key] ?? identity?.[key];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };

  const fullName =
    pick("full_name") ||
    pick("name") ||
    [pick("given_name"), pick("family_name")].filter(Boolean).join(" ") ||
    user.email?.split("@")[0] ||
    "New User";

  const avatarUrl = pick("avatar_url") || pick("picture") || null;

  // Preserve any existing full_name if it was manually set — only overwrite
  // when empty. Update avatar/email/phone opportunistically.
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const payload: {
    id: string;
    email: string | null;
    full_name?: string;
    avatar_url?: string;
  } = {
    id: user.id,
    email: user.email ?? null,
  };
  if (!existing) payload.full_name = fullName;
  else if (!existing.full_name) payload.full_name = fullName;
  if (!existing?.avatar_url && avatarUrl) payload.avatar_url = avatarUrl;

  const { error } = await supabase
    .from("profiles")
    .upsert([payload as any], { onConflict: "id" });

  if (error) console.warn("[authSync] profile upsert failed:", error.message);

  return { isNewProfile: !existing };
}

const OAUTH_REDIRECT_KEY = "kinsroot:oauth:redirect";

export function stashOAuthRedirect(path: string | null | undefined) {
  if (!path) return;
  // Only same-origin relative paths
  if (!path.startsWith("/") || path.startsWith("//")) return;
  try {
    sessionStorage.setItem(OAUTH_REDIRECT_KEY, path);
  } catch {
    /* ignore */
  }
}

export function consumeOAuthRedirect(): string | null {
  try {
    const v = sessionStorage.getItem(OAUTH_REDIRECT_KEY);
    if (v) sessionStorage.removeItem(OAUTH_REDIRECT_KEY);
    return v;
  } catch {
    return null;
  }
}

/**
 * Map raw OAuth SDK / provider errors to friendly, provider-specific copy.
 */
export function describeOAuthError(
  provider: "google" | "apple",
  err: unknown
): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
      ? err
      : (err as { message?: string })?.message || "";
  const msg = raw.toLowerCase();
  const label = provider === "google" ? "Google" : "Apple";

  if (msg.includes("popup") && (msg.includes("closed") || msg.includes("cancel")))
    return `${label} sign-in was closed before completing. Try again and finish the sign-in in the popup window.`;
  if (msg.includes("popup") && msg.includes("block"))
    return `Your browser blocked the ${label} sign-in popup. Please allow popups for this site and try again.`;
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("timeout"))
    return `Couldn't reach ${label}. Check your connection and try again.`;
  if (msg.includes("email") && msg.includes("exist"))
    return `An account already exists with this email. Sign in with the original method, then link ${label} from your profile.`;
  if (msg.includes("provider is not enabled") || msg.includes("unsupported provider"))
    return `${label} sign-in isn't fully configured yet. Please try again shortly or use email sign-in.`;
  if (msg.includes("invalid_grant") || msg.includes("access_denied"))
    return `${label} didn't grant access. Please try again and approve the sign-in request.`;
  if (raw) return `${label} sign-in failed: ${raw}`;
  return `${label} sign-in failed. Please try again.`;
}

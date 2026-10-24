import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { syncUserProfile, consumeOAuthRedirect } from "@/lib/authSync";
import { resolveSignInDestination } from "@/lib/membershipSync";
import { sessionManager } from "@/lib/sessionManager";

/**
 * Global auth listener mounted at the app root.
 *
 * Responsibilities:
 *  - Sync/upsert the public.profiles row on every sign-in (Google, Apple,
 *    email/password) so name, avatar, and email match the identity provider.
 *  - After Google/Apple redirect completes (which lands the user on `/` or
 *    another public route), navigate to the intended destination stashed
 *    before the OAuth handoff.
 *
 * This is separate from the Auth page listener so the OAuth full-page-redirect
 * flow — which does NOT return to `/auth` — still hydrates the profile and
 * ships the user to `/dashboard` (or a pending invitation).
 */
export function AuthBootstrap() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    let routing = false;

    const routeAfterSignIn = async (userId: string, freshSignIn: boolean) => {
      const currentPath = window.location.pathname;
      if (routing || (currentPath !== "/" && currentPath !== "/install")) return;
      const stashed = consumeOAuthRedirect();
      if (!stashed && !freshSignIn) return;
      routing = true;
      try {
        const target = await resolveSignInDestination(userId, stashed);
        if (mounted && (window.location.pathname === "/" || window.location.pathname === "/install")) {
          navigate(target, { replace: true });
        }
      } finally { routing = false; }
    };

    const handleSession = async (user: Parameters<typeof syncUserProfile>[0]) => {
      try {
        const { isNewProfile } = await syncUserProfile(user);
        if (isNewProfile) {
          localStorage.setItem("family-together-first-login", "true");
        }
      } catch (e) {
        console.warn("[AuthBootstrap] profile sync failed", e);
      }
    };

    // Hydrate on mount (covers full-page reload after OAuth redirect)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted || !session) return;
      await handleSession(session.user);

      await routeAfterSignIn(session.user.id, false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Auth callbacks run under the auth storage lock. Defer client requests
        // so profile hydration and getSession cannot deadlock on page reload.
        setTimeout(async () => {
        if (!mounted) return;
        if (event === "SIGNED_IN" && session) {
          await handleSession(session.user);
          // Record device metadata after the auth storage lock is released.
          sessionManager.recordCurrent().catch(() => {});
          await routeAfterSignIn(session.user.id, true);
        }
        }, 0);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { syncUserProfile, consumeOAuthRedirect } from "@/lib/authSync";
import { needsFamilyOnboarding } from "@/lib/membershipSync";

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

      const stashed = consumeOAuthRedirect();
      if (stashed && stashed !== location.pathname) {
        navigate(stashed, { replace: true });
      } else if (
        location.pathname === "/" &&
        location.hash === "" &&
        stashed === null &&
        sessionStorage.getItem("kinsroot:oauth:handled") !== "1"
      ) {
        // First landing after OAuth returns to origin — send to dashboard.
        // Only when we can attribute it to a fresh sign-in.
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session) {
          await handleSession(session.user);
          const stashed = consumeOAuthRedirect();
          const target = stashed || "/dashboard";
          // Only auto-navigate away from public/landing routes; don't fight
          // component-level navigation on /auth (Auth.tsx handles its own).
          if (
            location.pathname === "/" ||
            location.pathname === "/install"
          ) {
            navigate(target, { replace: true });
          }
        }
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

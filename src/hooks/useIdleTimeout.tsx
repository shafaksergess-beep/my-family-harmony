import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const IDLE_MS = 30 * 60 * 1000; // 30 min
const WARN_MS = 2 * 60 * 1000; // warn 2 min before

/**
 * Tracks user activity and forces sign-out after 30 min idle.
 * Shows a 2-min warning modal that lets the user stay signed in.
 */
export function useIdleTimeout(enabled: boolean) {
  const [warning, setWarning] = useState(false);
  const lastActivity = useRef<number>(Date.now());
  const timer = useRef<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled) return;

    const reset = () => {
      lastActivity.current = Date.now();
      if (warning) setWarning(false);
    };
    const events = ["mousemove", "keydown", "touchstart", "click", "scroll"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));

    const tick = () => {
      const idle = Date.now() - lastActivity.current;
      if (idle >= IDLE_MS) {
        supabase.auth.signOut({ scope: "local" }).finally(() => {
          navigate("/auth?reason=idle", { replace: true });
        });
      } else if (idle >= IDLE_MS - WARN_MS) {
        setWarning(true);
      }
    };
    timer.current = window.setInterval(tick, 15_000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [enabled, warning, navigate]);

  const stayActive = async () => {
    lastActivity.current = Date.now();
    setWarning(false);
    try { await supabase.auth.getUser(); } catch { /* noop */ }
  };

  const signOutNow = async () => {
    await supabase.auth.signOut({ scope: "local" });
    navigate("/auth", { replace: true });
  };

  return { warning, stayActive, signOutNow };
}

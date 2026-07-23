import { useEffect, useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import { supabase } from "@/integrations/supabase/client";

/**
 * Mounted once at the app root. Only runs the idle timer when a session exists.
 */
export function IdleWarningDialog() {
  const [hasSession, setHasSession] = useState(false);
  const [remaining, setRemaining] = useState(120);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setHasSession(!!s);
    });
    return () => subscription.unsubscribe();
  }, []);

  const { warning, stayActive, signOutNow } = useIdleTimeout(hasSession);

  useEffect(() => {
    if (!warning) { setRemaining(120); return; }
    setRemaining(120);
    const id = window.setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => window.clearInterval(id);
  }, [warning]);

  return (
    <AlertDialog open={warning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Still there?</AlertDialogTitle>
          <AlertDialogDescription>
            You have been inactive. For your security, you will be signed out in {remaining}s.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={signOutNow}>Sign out now</AlertDialogCancel>
          <AlertDialogAction onClick={stayActive}>Stay signed in</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

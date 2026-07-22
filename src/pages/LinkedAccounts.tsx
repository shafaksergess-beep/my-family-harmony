import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, ArrowLeft, Link as LinkIcon, Unlink, ShieldCheck, Mail } from "lucide-react";
import SEO from "@/components/SEO";
import { describeOAuthError, stashOAuthRedirect } from "@/lib/authSync";
import type { UserIdentity } from "@supabase/supabase-js";

type Provider = "google" | "apple";

const PROVIDER_META: Record<Provider, { label: string; hint: string }> = {
  google: { label: "Google", hint: "Sign in with your Google account" },
  apple: { label: "Apple", hint: "Sign in with your Apple ID" },
};

const LinkedAccounts = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [unlinkTarget, setUnlinkTarget] = useState<UserIdentity | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUserEmail(session.user.email ?? null);
    const { data, error } = await supabase.auth.getUserIdentities();
    if (error) {
      toast({ title: "Couldn't load linked accounts", description: error.message, variant: "destructive" });
    } else {
      setIdentities(data?.identities ?? []);
    }
    setLoading(false);
  }, [navigate, toast]);

  useEffect(() => { load(); }, [load]);

  const linkProvider = async (provider: Provider) => {
    setBusy(provider);
    try {
      stashOAuthRedirect("/profile/linked-accounts");
      const { error } = await supabase.auth.linkIdentity({
        provider,
        options: { redirectTo: `${window.location.origin}/profile/linked-accounts` },
      });
      if (error) throw error;
    } catch (err) {
      toast({
        title: `Couldn't link ${PROVIDER_META[provider].label}`,
        description: describeOAuthError(provider, err),
        variant: "destructive",
      });
      setBusy(null);
    }
  };

  const confirmUnlink = async () => {
    if (!unlinkTarget) return;
    const identity = unlinkTarget;
    setUnlinkTarget(null);
    setBusy(identity.identity_id);
    const { error } = await supabase.auth.unlinkIdentity(identity);
    if (error) {
      toast({
        title: "Couldn't unlink",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Account unlinked", description: `${identity.provider} disconnected.` });
      await load();
    }
    setBusy(null);
  };

  const canUnlink = identities.length > 1;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Linked accounts | Kinsroot"
        description="View and manage the sign-in providers connected to your Kinsroot account."
        canonicalPath="/profile/linked-accounts"
      />
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <Button variant="ghost" size="sm" onClick={() => navigate("/profile")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to profile
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" /> Linked accounts
            </CardTitle>
            <CardDescription>
              These sign-in methods can access your Kinsroot account
              {userEmail ? <> (<span className="font-medium">{userEmail}</span>)</> : null}.
              Linking another provider with the same verified email keeps everything on one account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                <section aria-labelledby="linked-heading" className="space-y-3">
                  <h2 id="linked-heading" className="text-sm font-semibold text-muted-foreground">Currently linked</h2>
                  <ul className="space-y-2">
                    {identities.map((identity) => {
                      const isEmail = identity.provider === "email";
                      const meta = PROVIDER_META[identity.provider as Provider];
                      const label = isEmail ? "Email & password" : meta?.label ?? identity.provider;
                      const identityEmail =
                        (identity.identity_data as any)?.email ?? userEmail ?? "";
                      return (
                        <li
                          key={identity.identity_id}
                          className="flex items-center justify-between gap-3 rounded-lg border p-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {isEmail ? <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
                              : <LinkIcon className="h-5 w-5 text-muted-foreground shrink-0" />}
                            <div className="min-w-0">
                              <p className="font-medium truncate">{label}</p>
                              <p className="text-xs text-muted-foreground truncate">{identityEmail}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">Linked</Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!canUnlink || busy === identity.identity_id}
                              aria-label={`Unlink ${label}`}
                              onClick={() => setUnlinkTarget(identity)}
                            >
                              {busy === identity.identity_id
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <><Unlink className="h-4 w-4 mr-1" /> Unlink</>}
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {!canUnlink && (
                    <p className="text-xs text-muted-foreground">
                      You need at least one sign-in method. Link another provider before unlinking this one.
                    </p>
                  )}
                </section>

                <section aria-labelledby="available-heading" className="space-y-3">
                  <h2 id="available-heading" className="text-sm font-semibold text-muted-foreground">Add another method</h2>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(Object.keys(PROVIDER_META) as Provider[])
                      .filter((p) => !identities.some((i) => i.provider === p))
                      .map((p) => (
                        <Button
                          key={p}
                          variant="outline"
                          className="justify-start"
                          disabled={busy === p}
                          onClick={() => linkProvider(p)}
                        >
                          {busy === p
                            ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            : <LinkIcon className="h-4 w-4 mr-2" />}
                          Link {PROVIDER_META[p].label}
                        </Button>
                      ))}
                    {(Object.keys(PROVIDER_META) as Provider[])
                      .every((p) => identities.some((i) => i.provider === p)) && (
                      <p className="text-sm text-muted-foreground col-span-full">
                        All supported providers are already linked.
                      </p>
                    )}
                  </div>
                </section>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!unlinkTarget} onOpenChange={(o) => !o && setUnlinkTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink this sign-in method?</AlertDialogTitle>
            <AlertDialogDescription>
              You won't be able to sign in with{" "}
              <span className="font-medium">{unlinkTarget?.provider}</span> anymore.
              You'll still have access with your other linked methods.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUnlink}>Unlink</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LinkedAccounts;

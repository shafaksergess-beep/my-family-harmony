import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
const PROVIDERS: Provider[] = ["google", "apple"];

const LinkedAccounts = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [unlinkTarget, setUnlinkTarget] = useState<UserIdentity | null>(null);

  const providerLabel = (p: Provider) => t(`linkedAccounts.providers.${p}`);

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
      toast({ title: t("linkedAccounts.loadErrorTitle"), description: error.message, variant: "destructive" });
    } else {
      setIdentities(data?.identities ?? []);
    }
    setLoading(false);
  }, [navigate, toast, t]);

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
        title: t("linkedAccounts.linkErrorTitle", { provider: providerLabel(provider) }),
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
        title: t("linkedAccounts.unlinkErrorTitle"),
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: t("linkedAccounts.unlinkedTitle"),
        description: t("linkedAccounts.unlinkedDescription", { provider: identity.provider }),
      });
      await load();
    }
    setBusy(null);
  };

  const canUnlink = identities.length > 1;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={t("linkedAccounts.seoTitle")}
        description={t("linkedAccounts.seoDescription")}
        canonical="/profile/linked-accounts"
      />
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <Button variant="ghost" size="sm" onClick={() => navigate("/profile")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> {t("linkedAccounts.backToProfile")}
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" /> {t("linkedAccounts.title")}
            </CardTitle>
            <CardDescription>
              {t("linkedAccounts.description")}
              {userEmail ? <> (<span className="font-medium">{userEmail}</span>)</> : null}.{" "}
              {t("linkedAccounts.descriptionSuffix")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                <section aria-labelledby="linked-heading" className="space-y-3">
                  <h2 id="linked-heading" className="text-sm font-semibold text-muted-foreground">
                    {t("linkedAccounts.currentlyLinked")}
                  </h2>
                  <ul className="space-y-2">
                    {identities.map((identity) => {
                      const isEmail = identity.provider === "email";
                      const label = isEmail
                        ? t("linkedAccounts.emailPassword")
                        : PROVIDERS.includes(identity.provider as Provider)
                          ? providerLabel(identity.provider as Provider)
                          : identity.provider;
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
                            <Badge variant="secondary">{t("linkedAccounts.linked")}</Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!canUnlink || busy === identity.identity_id}
                              aria-label={t("linkedAccounts.unlinkAria", { label })}
                              onClick={() => setUnlinkTarget(identity)}
                            >
                              {busy === identity.identity_id
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <><Unlink className="h-4 w-4 mr-1" /> {t("linkedAccounts.unlink")}</>}
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {!canUnlink && (
                    <p className="text-xs text-muted-foreground">
                      {t("linkedAccounts.needOneMethod")}
                    </p>
                  )}
                </section>

                <section aria-labelledby="available-heading" className="space-y-3">
                  <h2 id="available-heading" className="text-sm font-semibold text-muted-foreground">
                    {t("linkedAccounts.addAnother")}
                  </h2>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {PROVIDERS
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
                          {t("linkedAccounts.linkProvider", { provider: providerLabel(p) })}
                        </Button>
                      ))}
                    {PROVIDERS.every((p) => identities.some((i) => i.provider === p)) && (
                      <p className="text-sm text-muted-foreground col-span-full">
                        {t("linkedAccounts.allLinked")}
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
            <AlertDialogTitle>{t("linkedAccounts.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("linkedAccounts.confirmDescription", { provider: unlinkTarget?.provider ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("linkedAccounts.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUnlink}>{t("linkedAccounts.confirmAction")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LinkedAccounts;

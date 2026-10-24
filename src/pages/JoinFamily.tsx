import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, ArrowRight, CheckCircle, ArrowLeft } from "lucide-react";
import { acceptInvitation, invitationReturnPath, previewInvitation, type InvitationPreview } from "@/lib/invitations";
import SEO from "@/components/SEO";

export default function JoinFamily() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token");
  const initialCode = params.get("code") || "";
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);
  const request = useRef(0);

  async function validate(value: string, linkToken?: string | null) {
    const current = ++request.current;
    setBusy(true);
    setError("");
    try {
      const result = await previewInvitation(value, linkToken);
      if (current !== request.current) return;
      setPreview(result);
      if (!result) setError(t("inviteFlow.invalid"));
    } catch {
      if (current === request.current) setError(t("inviteFlow.loadFailed"));
    } finally {
      if (current === request.current) setBusy(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => { if (mounted) setUser(data.user); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
    if (initialCode || token) void validate(initialCode, token);
    return () => { mounted = false; request.current++; subscription.unsubscribe(); };
  }, [initialCode, token]);

  function openAuth(signup: boolean) {
    const target = invitationReturnPath(code, token);
    navigate(`/auth?redirect=${encodeURIComponent(target)}${signup ? "&mode=signup" : ""}`);
  }

  async function join() {
    if (!user) { openAuth(true); return; }
    setBusy(true);
    setError("");
    try {
      await acceptInvitation(code, token);
      setJoined(true);
    } catch {
      setError(t("inviteFlow.joinFailed"));
    } finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <SEO title={t("inviteFlow.title")} description={t("inviteFlow.subtitle")} noIndex />
      <div className="w-full max-w-md space-y-5 min-w-0">
        <header className="text-center space-y-3">
          <img src="/logo.jpg" alt="Kinsroot" className="w-16 h-16 mx-auto rounded-full" />
          <h1 className="text-2xl font-bold text-foreground">{t("inviteFlow.title")}</h1>
          <p className="text-muted-foreground">{t("inviteFlow.subtitle")}</p>
        </header>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" />{preview?.name || t("inviteFlow.codeTitle")}</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {!preview && <>
              <div className="space-y-2">
                <Label htmlFor="code">{t("inviteFlow.code")}</Label>
                <Input id="code" value={code} maxLength={8} autoComplete="off" className="text-center font-mono text-xl" onChange={(e) => { request.current++; setBusy(false); setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")); setError(""); }} onKeyDown={(e) => { if (e.key === "Enter" && code.length === 8) void validate(code); }} />
              </div>
              <Button className="w-full" disabled={busy || code.length !== 8} onClick={() => validate(code)}>{busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}{t("common.continue")}</Button>
            </>}
            {preview && !joined && <>
              {preview.logo_url && <img src={preview.logo_url} alt={preview.name} className="w-20 h-20 rounded-full object-cover mx-auto" />}
              {preview.description && <p className="text-muted-foreground">{preview.description}</p>}
              <p className="text-primary flex items-center gap-2"><CheckCircle className="w-4 h-4" />{t("inviteFlow.valid")}</p>
              <p>{t("inviteFlow.role", { role: t(`roles.${preview.role}`) })}</p>
              <p className="text-sm text-muted-foreground">{t("inviteFlow.expires", { date: new Date(preview.expires_at).toLocaleString(i18n.resolvedLanguage || "en") })}</p>
              {!user && <p className="text-sm text-muted-foreground">{t("inviteFlow.signupHint")}</p>}
              <Button className="w-full" disabled={busy} onClick={join}>{busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}{t(user ? "inviteFlow.join" : "inviteFlow.createAccount")}</Button>
              {!user && <Button variant="outline" className="w-full" onClick={() => openAuth(false)}>{t("inviteFlow.signIn")}</Button>}
            </>}
            {preview && joined && <>
              <CheckCircle className="w-12 h-12 text-primary mx-auto" />
              <h2 className="text-xl font-semibold text-center">{t("inviteFlow.welcome", { name: preview.name })}</h2>
              <Button className="w-full" onClick={() => navigate(`/family/${preview.slug}`)}>{t("inviteFlow.explore")}<ArrowRight className="w-4 h-4 ml-2" /></Button>
            </>}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
        {!joined && <Button variant="ghost" className="w-full" onClick={() => { request.current++; setPreview(null); setError(""); setBusy(false); setCode(""); navigate("/join/family", { replace: true }); }}><ArrowLeft className="w-4 h-4 mr-2" />{t("inviteFlow.otherCode")}</Button>}
      </div>
    </main>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { sessionManager, type ManagedSession } from "@/lib/sessionManager";
import { Loader2, LogOut, Monitor, ShieldCheck, ArrowLeft } from "lucide-react";
import SEO from "@/components/SEO";
import { formatDistanceToNow } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { useTranslation } from "react-i18next";

export default function SessionManagement() {
  const [sessions, setSessions] = useState<ManagedSession[]>([]);
  const { t, i18n } = useTranslation();
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyAll, setBusyAll] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    setFailed(false);
    try {
      const data = await sessionManager.list();
      setSessions(data.sessions);

    } catch (e: any) {
      setFailed(true);
      toast({ title: t("deviceSessions.loadFailed"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const revokeOthers = async () => {
    setBusyAll(true);
    try {
      await sessionManager.revokeOthers();
      toast({ title: t("common.success"), description: t("deviceSessions.signedOut") });
      await load();
    } catch (e: any) {
      toast({ title: t("deviceSessions.signOutFailed"), variant: "destructive" });
    } finally { setBusyAll(false); }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 max-w-3xl mx-auto">
      <SEO title={t("deviceSessions.title")} description={t("deviceSessions.description")} noIndex />
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> {t("common.back")}
      </Button>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary" /> {t("deviceSessions.title")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("deviceSessions.expiryNotice")}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : failed ? (
        <div role="alert" className="space-y-3">
          <p>{t("deviceSessions.loadFailed")}</p>
          <Button variant="outline" onClick={load}>{t("deviceSessions.retry")}</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.length === 0 && <p>{t("deviceSessions.empty")}</p>}
          {sessions.map((s) => (
            <Card key={s.id} className="p-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <Monitor className="w-5 h-5 text-muted-foreground mt-1 shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{s.device_label === "Unknown device" ? t("deviceSessions.unknownDevice") : s.device_label}</p>
                    {s.is_current && <Badge variant="secondary">{t("deviceSessions.thisDevice")}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("deviceSessions.lastActive", { time: formatDistanceToNow(new Date(s.last_seen_at), { addSuffix: true, locale: i18n.language.startsWith("fr") ? fr : enUS }) })}
                  </p>
                  {s.ip_address && <p className="text-xs text-muted-foreground">{t("deviceSessions.ip", { address: s.ip_address })}</p>}
                </div>
              </div>

            </Card>
          ))}
          {sessions.filter((s) => !s.is_current).length > 0 && (
            <Button variant="destructive" onClick={revokeOthers} disabled={busyAll} className="w-full mt-2">
              {busyAll ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogOut className="w-4 h-4 mr-2" />}
              {t("deviceSessions.signOutOthers")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

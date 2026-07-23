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

export default function SessionManagement() {
  const [sessions, setSessions] = useState<ManagedSession[]>([]);
  const [max, setMax] = useState(3);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAll, setBusyAll] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const data = await sessionManager.list();
      setSessions(data.sessions);
      setMax(data.max);
    } catch (e: any) {
      toast({ title: "Could not load sessions", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const revoke = async (id: string) => {
    setBusyId(id);
    try {
      await sessionManager.revoke(id);
      toast({ title: "Signed out", description: "That device has been signed out." });
      await load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setBusyId(null); }
  };

  const revokeOthers = async () => {
    setBusyAll(true);
    try {
      const r = await sessionManager.revokeOthers();
      toast({ title: "Done", description: `Signed out of ${r?.revoked ?? 0} other device(s).` });
      await load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setBusyAll(false); }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 max-w-3xl mx-auto">
      <SEO title="Active sessions" description="Review and sign out of devices signed into your Kinsroot account." noIndex />
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary" /> Active sessions
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Up to {max} devices can be signed in at once. Signing in on a new device beyond this limit will sign out the oldest one.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <Card key={s.id} className="p-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <Monitor className="w-5 h-5 text-muted-foreground mt-1 shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{s.device_label}</p>
                    {s.is_current && <Badge variant="secondary">This device</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last active {formatDistanceToNow(new Date(s.last_seen_at), { addSuffix: true })}
                  </p>
                  {s.ip_address && <p className="text-xs text-muted-foreground">IP {s.ip_address}</p>}
                </div>
              </div>
              {!s.is_current && (
                <Button variant="outline" size="sm" onClick={() => revoke(s.id)} disabled={busyId === s.id}>
                  {busyId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><LogOut className="w-4 h-4 mr-1" /> Sign out</>}
                </Button>
              )}
            </Card>
          ))}
          {sessions.filter((s) => !s.is_current).length > 0 && (
            <Button variant="destructive" onClick={revokeOthers} disabled={busyAll} className="w-full mt-2">
              {busyAll ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogOut className="w-4 h-4 mr-2" />}
              Sign out of all other devices
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

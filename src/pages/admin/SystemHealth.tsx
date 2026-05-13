import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Activity, RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CronJob { jobid: number; jobname: string; schedule: string; active: boolean; }
interface CronRun { jobid: number; status: string; return_message: string | null; start_time: string; end_time: string | null; }
interface Health {
  cron_jobs: CronJob[];
  cron_runs: CronRun[];
  activity_24h: number;
  activity_7d: number;
  unread_admin_notifications: number;
  pending_join_requests: number;
  active_families: number;
  total_users: number;
  generated_at: string;
}

const SystemHealth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Health | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }
    const { data: h, error } = await supabase.rpc("get_system_health" as any);
    if (error) {
      toast({ title: "Access denied", description: error.message, variant: "destructive" });
      navigate("/admin/dashboard");
      return;
    }
    setData(h as unknown as Health);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading || !data) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const lastRunByJob = new Map<number, CronRun>();
  for (const r of data.cron_runs) if (!lastRunByJob.has(r.jobid)) lastRunByJob.set(r.jobid, r);

  const failed = data.cron_runs.filter(r => r.status !== "succeeded").length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/admin/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="w-6 h-6" />System Health</h1>
              <p className="text-sm text-muted-foreground">Cron jobs, activity, and queue status</p>
            </div>
          </div>
          <Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Activity (24h)" value={data.activity_24h} />
          <StatCard label="Activity (7d)" value={data.activity_7d} />
          <StatCard label="Unread admin notifs" value={data.unread_admin_notifications} warn={data.unread_admin_notifications > 10} />
          <StatCard label="Pending join requests" value={data.pending_join_requests} warn={data.pending_join_requests > 0} />
          <StatCard label="Active families" value={data.active_families} />
          <StatCard label="Total users" value={data.total_users} />
          <StatCard label="Cron jobs" value={data.cron_jobs.length} />
          <StatCard label="Failed runs (recent)" value={failed} warn={failed > 0} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Scheduled Jobs</CardTitle>
            <CardDescription>Status of pg_cron jobs and their last run</CardDescription>
          </CardHeader>
          <CardContent>
            {data.cron_jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No cron jobs visible.</p>
            ) : (
              <div className="space-y-2">
                {data.cron_jobs.map(j => {
                  const last = lastRunByJob.get(j.jobid);
                  const ok = last?.status === "succeeded";
                  return (
                    <div key={j.jobid} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex items-center gap-3 min-w-0">
                        {!last ? <Clock className="w-4 h-4 text-muted-foreground shrink-0" /> :
                          ok ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> :
                          <XCircle className="w-4 h-4 text-destructive shrink-0" />}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{j.jobname}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {j.schedule}{last ? ` · last: ${new Date(last.start_time).toLocaleString()}` : " · never run"}
                          </p>
                          {last?.return_message && !ok && (
                            <p className="text-xs text-destructive truncate" title={last.return_message}>{last.return_message}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant={j.active ? "default" : "secondary"}>{j.active ? "active" : "paused"}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Job Runs</CardTitle>
            <CardDescription>Last 25 cron executions</CardDescription>
          </CardHeader>
          <CardContent>
            {data.cron_runs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No runs recorded yet.</p>
            ) : (
              <div className="space-y-1 text-sm">
                {data.cron_runs.map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 py-1 border-b border-border/50 last:border-0">
                    <span className="truncate">{new Date(r.start_time).toLocaleString()}</span>
                    <Badge variant={r.status === "succeeded" ? "default" : "destructive"} className="shrink-0">{r.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-right">Generated: {new Date(data.generated_at).toLocaleString()}</p>
      </main>
    </div>
  );
};

const StatCard = ({ label, value, warn }: { label: string; value: number; warn?: boolean }) => (
  <Card>
    <CardContent className="pt-6">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${warn ? "text-destructive" : ""}`}>{value}</p>
    </CardContent>
  </Card>
);

export default SystemHealth;

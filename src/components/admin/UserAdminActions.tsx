import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { Ban, KeyRound, History, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription } from "@/components/ui/responsive-dialog";

type Target = { id: string; full_name: string; email: string };
type Kind = "suspend" | "unsuspend" | "reset" | "history";
let current: { kind: Kind; user: Target; onChanged?: () => void } | null = null;
const listeners = new Set<() => void>();
const setCurrent = (v: typeof current) => { current = v; listeners.forEach((l) => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

async function callAction(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("admin-user-actions", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useSuspendedUsers(ids: string[]) {
  const [suspended, setSuspended] = useState<Set<string>>(new Set());
  const key = ids.join(",");
  const refresh = useCallback(async () => {
    if (!key) return;
    try { const data = await callAction({ action: "status", userIds: key.split(",") }); setSuspended(new Set(data?.suspended ?? [])); } catch { /* status is informational */ }
  }, [key]);
  useEffect(() => { void refresh(); }, [refresh]);
  return { suspended, refresh };
}

interface Props { user: Target; variant: "menu" | "buttons"; isSuperAdminViewer: boolean; isSelf: boolean; isSuspended: boolean; onChanged?: () => void }

export function UserAdminActions({ user, variant, isSuperAdminViewer, isSelf, isSuspended, onChanged }: Props) {
  const { t } = useTranslation();
  if (!isSuperAdminViewer) return null;
  const open = (kind: Kind) => setCurrent({ kind, user, onChanged });
  const actions: { kind: Kind; label: string; icon: typeof Ban; show: boolean; destructive?: boolean }[] = [
    { kind: "history", label: t("userAdmin.history"), icon: History, show: true },
    { kind: "reset", label: t("userAdmin.resetPassword"), icon: KeyRound, show: !isSelf },
    { kind: isSuspended ? "unsuspend" : "suspend", label: isSuspended ? t("userAdmin.reactivate") : t("userAdmin.suspend"), icon: isSuspended ? CheckCircle2 : Ban, show: !isSelf, destructive: !isSuspended },
  ];
  if (variant === "menu") return <>{actions.filter((a) => a.show).map((a) => <DropdownMenuItem key={a.kind} onClick={() => open(a.kind)} className={a.destructive ? "text-destructive" : undefined}><a.icon className="h-4 w-4" />{a.label}</DropdownMenuItem>)}</>;
  return <>{actions.filter((a) => a.show).map((a) => <Button key={a.kind} variant={a.destructive ? "outline" : "ghost"} size="sm" onClick={() => open(a.kind)} className={a.destructive ? "text-destructive" : undefined}><a.icon className="mr-1 h-4 w-4" />{a.label}</Button>)}</>;
}

interface Log { id: string; action_type: string; entity_type: string | null; created_at: string }

export function UserAdminDialogs() {
  const { t, i18n } = useTranslation();
  const state = useSyncExternalStore(subscribe, () => current);
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<Log[] | null>(null);
  const close = () => { setCurrent(null); setLogs(null); };

  useEffect(() => {
    if (state?.kind !== "history") return;
    setLogs(null);
    supabase.from("activity_logs").select("id, action_type, entity_type, created_at").eq("user_id", state.user.id).order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => setLogs((data as Log[]) ?? []));
  }, [state]);

  const confirm = async () => {
    if (!state) return;
    setBusy(true);
    try {
      if (state.kind === "reset") await callAction({ action: "reset-password", userId: state.user.id, redirectTo: `${window.location.origin}/reset-password` });
      else await callAction({ action: state.kind, userId: state.user.id });
      toast({ title: t(`userAdmin.done.${state.kind}`, { name: state.user.full_name }) });
      state.onChanged?.();
      close();
    } catch {
      toast({ title: t("admUsers.error"), description: t("userAdmin.failed"), variant: "destructive" });
    } finally { setBusy(false); }
  };

  return <>
    <AlertDialog open={!!state && state.kind !== "history"} onOpenChange={(o) => !o && close()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state && state.kind !== "history" ? t(`userAdmin.confirm.${state.kind}.title`) : ""}</AlertDialogTitle>
          <AlertDialogDescription>{state && state.kind !== "history" ? t(`userAdmin.confirm.${state.kind}.body`, { name: state.user.full_name, email: state.user.email }) : ""}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={(e) => { e.preventDefault(); void confirm(); }} className={state?.kind === "suspend" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}>{t("userAdmin.confirmButton")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <ResponsiveDialog open={state?.kind === "history"} onOpenChange={(o) => !o && close()}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t("userAdmin.historyTitle", { name: state?.user.full_name ?? "" })}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>{t("userAdmin.historyDescription")}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="space-y-2 pb-4">
          {logs === null ? <p className="text-sm text-muted-foreground">{t("admUserActivity.loadingActivities")}</p>
            : logs.length === 0 ? <p className="text-sm text-muted-foreground">{t("admUserActivity.noActivitiesFound")}</p>
            : logs.map((l) => <div key={l.id} className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
                <div className="min-w-0"><Badge variant="outline" className="max-w-full truncate">{l.action_type}</Badge>{l.entity_type && <p className="mt-1 truncate text-xs text-muted-foreground">{l.entity_type}</p>}</div>
                <span className="shrink-0 text-right text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString(i18n.language)}</span>
              </div>)}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  </>;
}

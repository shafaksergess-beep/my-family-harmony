import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, Users, BarChart3, Activity, Megaphone, LayoutGrid, HeartPulse, ChevronRight } from 'lucide-react';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCarousel } from '@/components/layout/StatCarousel';
import { DashboardSkeleton } from './SkeletonCard';
import { PageHeader } from '@/components/layout/PageHeader';
interface Health { active_families: number; total_users: number; pending_join_requests: number; cron_runs: { status: string }[] }
export function MobileAdminHome() {
  const { t } = useTranslation(); const navigate = useNavigate(); const { isSuperAdmin, loading: roleLoading } = usePlatformRole(); const { isOnline } = useOnlineStatus();
  const [health, setHealth] = useState<Health | null>(null); const [familyCount, setFamilyCount] = useState<number | null>(null); const [userCount, setUserCount] = useState<number | null>(null); const [pendingCount, setPendingCount] = useState<number | null>(null); const [logs, setLogs] = useState<{ id: string; action_type: string; entity_type: string; created_at: string }[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!isSuperAdmin) return; let active = true;
    Promise.all([supabase.rpc('get_system_health' as any), supabase.from('admin_logs').select('id, action_type, entity_type, created_at').order('created_at', { ascending: false }).limit(6), supabase.from('families').select('id', { count: 'exact', head: true }), supabase.from('profiles').select('id', { count: 'exact', head: true }), supabase.from('join_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending')]).then(([h, l, f, u, pending]) => { if (active) { setHealth(h.error ? null : h.data as unknown as Health); setLogs(l.data || []); setFamilyCount(f.error ? null : f.count); setUserCount(u.error ? null : u.count); setPendingCount(pending.error ? null : pending.count); setLoading(false); } });
    return () => { active = false; };
  }, [isSuperAdmin]);
  if (roleLoading || (isSuperAdmin && loading)) return <DashboardSkeleton />;
  if (!isSuperAdmin) return null;
  const primary = [{ key: 'families', path: 'families', icon: Building2, count: familyCount }, { key: 'users', path: 'users', icon: Users, count: health?.total_users ?? userCount }, { key: 'analytics', path: 'global-analytics', icon: BarChart3, count: null }, { key: 'logs', path: 'activity-logs', icon: Activity, count: null }];
  const secondary = [{ key: 'announcements', path: 'announcements', icon: Megaphone }, { key: 'modules', path: 'modules', icon: LayoutGrid }, { key: 'health', path: 'system-health', icon: HeartPulse }];
  const desc: Record<string, string> = { families: 'familiesDesc', users: 'usersDesc', analytics: 'analyticsDesc', logs: 'logsDesc' };
  return <div className="min-w-0 bg-background"><div className="rounded-b-[2rem] bg-primary pb-5 text-primary-foreground [&_header]:bg-transparent [&_header]:text-primary-foreground"><PageHeader title={t('phase2.adminHome')} /><p className="mt-3 px-4 text-sm">{t('dash.superAdministrator')}</p></div><main className="space-y-6 p-4"><StatCarousel items={[
    { key: 'families', label: t('foundation.families'), value: familyCount ?? t('phase2.unavailable'), icon: Building2, onClick: () => navigate('/admin/families') },
    { key: 'users', label: t('foundation.users'), value: health?.total_users ?? userCount ?? t('phase2.unavailable'), icon: Users, onClick: () => navigate('/admin/users') },
    { key: 'pending', label: t('phase2.pendingApprovals'), value: health?.pending_join_requests ?? pendingCount ?? t('phase2.unavailable'), onClick: () => navigate('/admin/families') },
    { key: 'health', label: t('phase2.systemHealth'), value: health ? t('phase2.failedRuns', { count: health.cron_runs.filter(r => r.status !== 'succeeded').length }) : t('phase2.unavailable'), icon: HeartPulse, onClick: () => navigate('/admin/system-health') },
  ]} /><section><h2 className="mb-3 text-lg font-semibold">{t('phase2.adminHomeV2.primary')}</h2><div className="grid grid-cols-2 gap-3">{primary.map(link => <button key={link.key} type="button" onClick={() => navigate(`/admin/${link.path}`)} className="flex min-w-0 flex-col items-start gap-2 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-colors active:bg-muted"><span className="flex w-full items-center justify-between gap-2"><span className="rounded-xl bg-primary/10 p-2"><link.icon className="h-5 w-5 text-primary" /></span>{link.count != null && <span className="text-xl font-bold tabular-nums text-foreground">{link.count}</span>}</span><span className="max-w-full truncate font-semibold text-foreground">{t(`phase2.admin.${link.key}`)}</span><span className="max-w-full text-xs text-muted-foreground">{t(`phase2.adminHomeV2.${desc[link.key]}`)}</span></button>)}</div></section><section><h2 className="mb-3 text-lg font-semibold">{t('phase2.adminHomeV2.more')}</h2><div className="grid grid-cols-3 gap-3">{secondary.map(link => <Button key={link.key} variant="outline" className="h-auto min-w-0 flex-col gap-2 rounded-2xl py-4" onClick={() => navigate(`/admin/${link.path}`)}><link.icon className="h-6 w-6 text-primary" /><span className="max-w-full text-center text-xs">{link.key === 'health' ? t('phase2.systemHealth') : t(`phase2.admin.${link.key}`)}</span></Button>)}</div></section><section><h2 className="mb-3 text-lg font-semibold">{t('mobileHome.recentActivity')}</h2>{logs.length ? <div className="space-y-2">{logs.map(log => <Button key={log.id} variant="outline" className="h-auto w-full justify-between gap-2 rounded-2xl py-3" onClick={() => navigate('/admin/activity-logs')}><span className="min-w-0 text-left"><span className="block truncate">{t(`phase2.action.${log.action_type.toLowerCase()}`, { defaultValue: t('phase2.recordUpdated') })}</span><span className="block text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span></span><ChevronRight className="h-4 w-4 shrink-0" /></Button>)}</div> : <p className="text-sm text-muted-foreground">{t(isOnline ? 'mobileHome.noActivity' : 'phase2.offlineEmpty')}</p>}</section></main></div>;
}

import { useState, type ComponentType } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, Calendar, Wallet, Plus, Receipt, QrCode, HandCoins, Heart, MoreHorizontal, Bell, User, Building2, BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFamilyAuth } from '@/hooks/useFamilyAuth';
import { useFamilyModules } from '@/hooks/useFamilyModules';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
type Item = { key: string; label: string; icon: ComponentType<{ className?: string }>; path?: string; module?: string; onClick?: () => void };
function NavBar({ items, quickActions = [] }: { items: Item[]; quickActions?: Item[] }) {
  const { t } = useTranslation(); const navigate = useNavigate(); const location = useLocation(); const [open, setOpen] = useState(false);
  const go = (item: Item) => { void haptics.selection(); setOpen(false); if (item.onClick) item.onClick(); else if (item.path) navigate(item.path); };
  const render = (item: Item) => {
    const active = item.path && (location.pathname === item.path || (item.key !== 'home' && item.key !== 'overview' && location.pathname.startsWith(item.path + '/')));
    return <Button key={item.key} variant="ghost" aria-label={item.label} aria-current={active ? 'page' : undefined} onClick={() => go(item)} className={cn('!h-16 min-w-0 flex-1 flex-col gap-1 rounded-none px-0 py-1', active ? 'text-primary' : 'text-muted-foreground')}><item.icon className="h-5 w-5 shrink-0" /><span className="max-w-full truncate px-0.5 text-[10px] leading-tight">{item.label}</span></Button>;
  };
  return <>
    <nav aria-label={t('foundation.navigation')} data-shell-nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-safe">
      <div className="flex h-16 items-center px-1">{items.map((item, i) => <div key={item.key} className="contents">{quickActions.length > 0 && i === 2 && <div className="flex min-w-0 flex-1 justify-center"><Button aria-label={t('mobileHome.actions')} size="icon" onClick={() => setOpen(true)} className="-mt-6 h-12 w-12 shrink-0 rounded-full ring-4 ring-card"><Plus className="h-7 w-7" /></Button></div>}{render(item)}</div>)}</div>
    </nav>
    <Sheet open={open} onOpenChange={setOpen}><SheetContent side="bottom" className="max-h-[90dvh] rounded-t-2xl pb-safe"><SheetHeader><SheetTitle>{t('mobileHome.actions')}</SheetTitle><SheetDescription className="sr-only">{t('foundation.quickActions')}</SheetDescription></SheetHeader><div className="mt-4 grid grid-cols-2 gap-3">{quickActions.map(a => <Button key={a.key} variant="secondary" onClick={() => go(a)} className="min-h-24 min-w-0 flex-col rounded-2xl p-3 text-center"><a.icon className="h-6 w-6" /><span className="break-words">{a.label}</span></Button>)}</div></SheetContent></Sheet>
  </>;
}
function FamilyNav({ slug }: { slug: string }) {
  const { t } = useTranslation(); const { family } = useFamilyAuth(slug); const { isModuleEnabled, loading } = useFamilyModules(family?.id);
  const base = `/family/${slug}`;
  const enabled = (i: Item) => !i.module || (!loading && isModuleEnabled(i.module));
  const items: Item[] = [
    { key: 'home', label: t('nav.home'), icon: Home, path: base },
    { key: 'members', label: t('nav.members'), icon: Users, path: `${base}/members` },
    { key: 'meetings', label: t('nav.meetings'), icon: Calendar, path: `${base}/meetings`, module: 'meetings' },
    { key: 'finance', label: t('nav.finance'), icon: Wallet, path: `${base}/contributions`, module: 'contributions' },
    { key: 'more', label: t('foundation.more'), icon: MoreHorizontal, path: `${base}/more` },
  ];
  const actions: Item[] = [
    { key: 'proof', label: t('mobileHome.submitProof'), icon: Receipt, path: `${base}/payment-proofs` },
    { key: 'qr', label: t('mobileHome.scanQr'), icon: QrCode, path: `${base}/meetings`, module: 'meetings' },
    { key: 'loan', label: t('mobileHome.requestLoan'), icon: HandCoins, path: `${base}/loans`, module: 'loans' },
    { key: 'aid', label: t('mobileHome.requestAssistance'), icon: Heart, path: `${base}/assistance`, module: 'assistance' },
  ];
  return <NavBar items={items.filter(enabled)} quickActions={actions.filter(enabled)} />;
}
function AdminNav() {
  const { isSuperAdmin } = usePlatformRole(); const { t } = useTranslation(); const [open, setOpen] = useState(false); const navigate = useNavigate();
  if (!isSuperAdmin) return null;
  const more = [ ['admDashboard.adminLogs', '/admin/activity-logs'], ['admDashboard.rolePermissions', '/admin/role-permissions'], ['admin.languages.title', '/admin/languages'], ['admDashboard.systemHealth', '/admin/system-health'] ];
  return <><NavBar items={[
    { key: 'overview', label: t('foundation.overview'), icon: Home, path: '/admin/dashboard' },
    { key: 'families', label: t('foundation.families'), icon: Building2, path: '/admin/families' },
    { key: 'users', label: t('foundation.users'), icon: Users, path: '/admin/users' },
    { key: 'analytics', label: t('foundation.analytics'), icon: BarChart3, path: '/admin/global-analytics' },
    { key: 'more', label: t('foundation.more'), icon: MoreHorizontal, onClick: () => setOpen(true) },
  ]} /><Sheet open={open} onOpenChange={setOpen}><SheetContent side="bottom" className="rounded-t-2xl pb-safe"><SheetHeader><SheetTitle>{t('foundation.more')}</SheetTitle><SheetDescription className="sr-only">{t('foundation.navigation')}</SheetDescription></SheetHeader><div className="mt-4 flex flex-col gap-2">{more.map(([label, path]) => <Button key={path} variant="ghost" onClick={() => { setOpen(false); navigate(path); }}>{t(label)}</Button>)}</div></SheetContent></Sheet></>;
}
function PersonalNav() {
  const { t } = useTranslation(); const navigate = useNavigate();
  const dashboardSection = (section: string) => { navigate(`/dashboard#${section}`); requestAnimationFrame(() => document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' })); };
  return <NavBar items={[
    { key: 'home', label: t('nav.home'), icon: Home, path: '/dashboard' },
    { key: 'families', label: t('foundation.families'), icon: Building2, onClick: () => dashboardSection('families') },
    { key: 'notifications', label: t('foundation.notifications'), icon: Bell, onClick: () => dashboardSection('notifications') },
    { key: 'profile', label: t('foundation.profile'), icon: User, path: '/profile' },
  ]} />;
}
export function ShellBottomNav({ familySlug, admin }: { familySlug?: string; admin?: boolean }) {
  return familySlug ? <FamilyNav slug={familySlug} /> : admin ? <AdminNav /> : <PersonalNav />;
}

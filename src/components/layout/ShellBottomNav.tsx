import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, Calendar, Wallet, Plus, Receipt, QrCode, HandCoins, Heart, MoreHorizontal, Bell, User, Building2, BarChart3, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFamilyAuth } from '@/hooks/useFamilyAuth';
import { useFamilyModules } from '@/hooks/useFamilyModules';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { filterEnabledItems, isItemActive, nextNavHidden } from '@/lib/shellNav';
import { NotificationInbox } from '@/components/NotificationInbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
type Item = { key: string; label: string; icon: LucideIcon; path?: string; module?: string; onClick?: () => void; inbox?: boolean };
function NavBar({ items, quickActions = [] }: { items: Item[]; quickActions?: Item[] }) {
  const { t } = useTranslation(); const navigate = useNavigate(); const location = useLocation(); const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  const go = (item: Item) => { void haptics.selection(); setOpen(false); if (item.onClick) item.onClick(); else if (item.path) navigate(item.path); };
  // Hide on scroll down, reveal on scroll up; one passive listener, transform only.
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const y = window.scrollY;
        setHidden(prev => nextNavHidden(prev, y, lastY.current, document.documentElement.scrollHeight, window.innerHeight));
        lastY.current = y;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  // Always visible on route change.
  useEffect(() => { setHidden(false); lastY.current = window.scrollY; }, [location.pathname]);
  // Drive the shared offset so management-create-bar and bottom-action-bar drop with the dock.
  useEffect(() => {
    const shell = document.querySelector<HTMLElement>('[data-app-shell]');
    shell?.style.setProperty('--shell-nav-offset', hidden ? 'var(--shell-nav-height)' : '0px');
    return () => { shell?.style.setProperty('--shell-nav-offset', '0px'); };
  }, [hidden]);
  const activeKey = items.find(i => isItemActive(i, location.pathname))?.key;
  useLayoutEffect(() => {
    const measure = () => {
      const el = activeKey ? itemRefs.current[activeKey] : null;
      if (!el) { setPill(null); return; }
      setPill({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [activeKey, items.length]);
  const render = (item: Item) => {
    const active = isItemActive(item, location.pathname);
    const control = <Button variant="ghost" aria-label={item.label} aria-current={active ? 'page' : undefined} onClick={item.inbox ? undefined : () => go(item)} className={cn('h-16 w-full min-w-0 flex-col gap-1 rounded-2xl px-0 py-1', active ? 'text-primary' : 'text-muted-foreground')}><item.icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.5 : 2} /><span className="shell-nav-label max-w-full truncate px-0.5 text-[10px] leading-tight">{item.label}</span></Button>;
    return <div key={item.key} ref={el => { itemRefs.current[item.key] = el; }} className="relative flex min-w-0 flex-1">{item.inbox ? <NotificationInbox trigger={control} /> : control}</div>;
  };
  return <>
    <nav aria-label={t('foundation.navigation')} data-shell-nav onFocusCapture={() => setHidden(false)} className="fixed inset-x-3 z-40 rounded-3xl border border-border bg-card shadow-lg transition-transform duration-200" style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))', transform: hidden ? 'translateY(calc(100% + 1.5rem))' : 'translateY(0)' }}>
      <div ref={listRef} className="relative flex h-16 items-center px-1">
        {pill && <span aria-hidden className="absolute inset-y-1 left-0 rounded-2xl bg-primary/10 transition-transform duration-200" style={{ width: pill.width, transform: `translateX(${pill.left}px)` }} />}
        {items.map((item, i) => <div key={item.key} className="contents">{quickActions.length > 0 && i === 2 && <div className="relative flex min-w-0 flex-1 justify-center"><Button aria-label={t('mobileHome.actions')} aria-expanded={open} size="icon" onClick={() => setOpen(o => !o)} className="-mt-7 h-14 w-14 shrink-0 rounded-full border border-border text-secondary-foreground shadow-lg" style={{ background: 'var(--gradient-gold)' }}><Plus className={cn('h-7 w-7 transition-transform duration-200', open && 'rotate-45')} /></Button></div>}{render(item)}</div>)}
      </div>
    </nav>
    <Sheet open={open} onOpenChange={setOpen}><SheetContent side="bottom" className="max-h-[90dvh] rounded-t-2xl pb-safe"><SheetHeader><SheetTitle>{t('mobileHome.actions')}</SheetTitle><SheetDescription className="sr-only">{t('foundation.quickActions')}</SheetDescription></SheetHeader><div className="mt-4 grid grid-cols-2 gap-3">{quickActions.map(a => <Button key={a.key} variant="secondary" onClick={() => go(a)} className="min-h-24 min-w-0 flex-col rounded-2xl p-3 text-center"><a.icon className="h-6 w-6" /><span className="break-words">{a.label}</span></Button>)}</div></SheetContent></Sheet>
  </>;
}
function FamilyNav({ slug }: { slug: string }) {
  const { t } = useTranslation(); const navigate = useNavigate(); const { family } = useFamilyAuth(slug); const { isModuleEnabled, loading } = useFamilyModules(family?.id);
  const openCheckIn = async () => {
    if (!family?.id) return;
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase.from('meetings').select('id').eq('family_id', family.id).gte('meeting_date', today).eq('is_completed', false).order('meeting_date', { ascending: true }).limit(1).maybeSingle();
    if (data?.id) navigate(`/family/${slug}/meetings/${data.id}/checkin`);
    else { toast({ title: t('mobileHome.noUpcomingMeeting') }); navigate(`/family/${slug}/meetings`); }
  };
  const base = `/family/${slug}`;
  const items: Item[] = [
    { key: 'home', label: t('nav.home'), icon: Home, path: base },
    { key: 'members', label: t('nav.members'), icon: Users, path: `${base}/members` },
    { key: 'meetings', label: t('nav.meetings'), icon: Calendar, path: `${base}/meetings`, module: 'meetings' },
    { key: 'finance', label: t('nav.finance'), icon: Wallet, path: `${base}/contributions`, module: 'contributions' },
    { key: 'more', label: t('foundation.more'), icon: MoreHorizontal, path: `${base}/more` },
  ];
  const actions: Item[] = [
    { key: 'proof', label: t('mobileHome.submitProof'), icon: Receipt, path: `${base}/payment-proofs` },
    { key: 'qr', label: t('mobileHome.checkIn'), icon: QrCode, module: 'meetings', onClick: () => { void openCheckIn(); } },
    { key: 'loan', label: t('mobileHome.requestLoan'), icon: HandCoins, path: `${base}/loans`, module: 'loans' },
    { key: 'aid', label: t('mobileHome.requestAssistance'), icon: Heart, path: `${base}/assistance`, module: 'assistance' },
  ];
  return <NavBar items={filterEnabledItems(items, isModuleEnabled, loading)} quickActions={filterEnabledItems(actions, isModuleEnabled, loading)} />;
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
    { key: 'notifications', label: t('foundation.notifications'), icon: Bell, inbox: true },
    { key: 'profile', label: t('foundation.profile'), icon: User, path: '/profile' },
  ]} />;
}
export function ShellBottomNav({ familySlug, admin }: { familySlug?: string; admin?: boolean }) {
  return familySlug ? <FamilyNav slug={familySlug} /> : admin ? <AdminNav /> : <PersonalNav />;
}

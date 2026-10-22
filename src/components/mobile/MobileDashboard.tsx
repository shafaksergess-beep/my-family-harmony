import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Wallet,
  Calendar,
  HandCoins,
  QrCode,
  ChevronRight,
  ChevronDown,
  Users,
  PiggyBank,
  TrendingUp,
  AlertCircle,
  Building2,
  Clock,
  CheckCircle,
  DollarSign,
  Heart,
  Bell,
  Search,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { haptics } from '@/lib/haptics';
import { MobileLayout } from './MobileLayout';
import { PullToRefresh } from './PullToRefresh';
import { OfflineIndicator } from './OfflineIndicator';
import { DashboardSkeleton } from './SkeletonCard';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserFamily {
  family_id: string;
  family_name: string;
  family_slug: string;
  user_role: string;
}

interface DashboardStats {
  pendingContributions: number;
  totalSavings: number;
  activeLoans: number;
  upcomingMeetings: number;
  nextMeetingDate: string | null;
}

interface ActivityItem {
  id: string;
  type: 'contribution' | 'loan' | 'meeting' | 'assistance' | 'member';
  title: string;
  description: string;
  timestamp: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
}

export function MobileDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isOnline } = useOnlineStatus();
  const [loading, setLoading] = useState(true);
  const [userFamilies, setUserFamilies] = useState<UserFamily[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<UserFamily | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    pendingContributions: 0,
    totalSavings: 0,
    activeLoans: 0,
    upcomingMeetings: 0,
    nextMeetingDate: null,
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [memberId, setMemberId] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      // Get profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      setProfile(profileData);

      // Get families
      const { data: familiesData } = await supabase.rpc('get_user_families', {
        check_user_id: session.user.id,
      });
      setUserFamilies(familiesData || []);

      if (familiesData && familiesData.length > 0) {
        const family = selectedFamily || familiesData[0];
        setSelectedFamily(family);
        await loadFamilyStats(family.family_id, session.user.id);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [navigate, selectedFamily]);

  const loadFamilyStats = async (familyId: string, userId: string) => {
    try {
      // Get member ID
      const { data: memberData } = await supabase
        .from('family_members')
        .select('id')
        .eq('family_id', familyId)
        .eq('user_id', userId)
        .single();

      if (memberData) {
        setMemberId(memberData.id);

        // Get pending contributions
        const { count: pendingCount } = await supabase
          .from('contributions')
          .select('*', { count: 'exact', head: true })
          .eq('family_id', familyId)
          .eq('member_id', memberData.id)
          .eq('status', 'pending');

        // Get total savings
        const { data: savingsData } = await supabase
          .from('savings')
          .select('amount')
          .eq('family_id', familyId)
          .eq('member_id', memberData.id);
        const totalSavings = savingsData?.reduce((sum, s) => sum + Number(s.amount), 0) || 0;

        // Get active loans
        const { count: loansCount } = await supabase
          .from('loans')
          .select('*', { count: 'exact', head: true })
          .eq('family_id', familyId)
          .eq('member_id', memberData.id)
          .in('status', ['approved', 'disbursed']);

        // Get upcoming meetings
        const today = new Date().toISOString().split('T')[0];
        const { data: meetingsData, count: meetingsCount } = await supabase
          .from('meetings')
          .select('*', { count: 'exact' })
          .eq('family_id', familyId)
          .gte('meeting_date', today)
          .order('meeting_date', { ascending: true })
          .limit(1);

        setStats({
          pendingContributions: pendingCount || 0,
          totalSavings,
          activeLoans: loansCount || 0,
          upcomingMeetings: meetingsCount || 0,
          nextMeetingDate: meetingsData?.[0]?.meeting_date || null,
        });

        // Load recent activities
        await loadActivities(familyId);
      }
    } catch (error) {
      console.error('Error loading family stats:', error);
    }
  };

  const loadActivities = async (familyId: string) => {
    try {
      const activityItems: ActivityItem[] = [];

      // Get recent contributions
      const { data: contributions } = await supabase
        .from('contributions')
        .select('id, amount, status, created_at, type')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false })
        .limit(3);

      contributions?.forEach((c) => {
        activityItems.push({
          id: `contrib-${c.id}`,
          type: 'contribution',
          title: `${c.type} Contribution`,
          description: `${c.status === 'paid' ? 'Paid' : 'Pending'} - ${c.amount.toLocaleString()} FCFA`,
          timestamp: c.created_at,
          icon: c.status === 'paid' ? CheckCircle : Clock,
          iconBg: c.status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600',
        });
      });

      // Get recent loans
      const { data: loans } = await supabase
        .from('loans')
        .select('id, amount, status, created_at')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false })
        .limit(2);

      loans?.forEach((l) => {
        activityItems.push({
          id: `loan-${l.id}`,
          type: 'loan',
          title: 'Loan Request',
          description: `${l.status} - ${l.amount.toLocaleString()} FCFA`,
          timestamp: l.created_at,
          icon: HandCoins,
          iconBg: 'bg-blue-100 text-blue-600',
        });
      });

      // Get upcoming meetings
      const { data: meetings } = await supabase
        .from('meetings')
        .select('id, meeting_date, meeting_type')
        .eq('family_id', familyId)
        .gte('meeting_date', new Date().toISOString().split('T')[0])
        .order('meeting_date', { ascending: true })
        .limit(2);

      meetings?.forEach((m) => {
        activityItems.push({
          id: `meeting-${m.id}`,
          type: 'meeting',
          title: `${m.meeting_type} Meeting`,
          description: format(new Date(m.meeting_date), 'EEEE, MMM d'),
          timestamp: m.meeting_date,
          icon: Calendar,
          iconBg: 'bg-purple-100 text-purple-600',
        });
      });

      // Sort by timestamp
      activityItems.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setActivities(activityItems.slice(0, 6));
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleFamilyChange = async (family: UserFamily) => {
    await haptics.selection();
    setSelectedFamily(family);
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await loadFamilyStats(family.family_id, session.user.id);
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    await loadDashboardData();
  };

  const { isRefreshing, pullDistance, handlers } = usePullToRefresh({
    onRefresh: handleRefresh,
    disabled: !isOnline,
  });

  const slug = selectedFamily?.family_slug;
  const go = async (path: string) => {
    await haptics.light();
    navigate(path);
  };

  const tiles = [
    { label: t('mobileHome.pay'), icon: Wallet, path: slug ? `/family/${slug}/payment-proofs` : '/dashboard', tone: 'bg-primary/10 text-primary' },
    { label: t('mobileHome.checkIn'), icon: QrCode, path: slug ? `/family/${slug}/meetings` : '/dashboard', tone: 'bg-accent/20 text-accent-foreground' },
    { label: t('mobileHome.loans'), icon: HandCoins, path: slug ? `/family/${slug}/loans` : '/dashboard', tone: 'bg-secondary/25 text-foreground' },
    { label: t('mobileHome.savings'), icon: PiggyBank, path: slug ? `/family/${slug}/savings` : '/dashboard', tone: 'bg-destructive/10 text-destructive' },
    { label: t('mobileHome.members'), icon: Users, path: slug ? `/family/${slug}/members` : '/dashboard', tone: 'bg-primary/10 text-primary' },
    { label: t('mobileHome.assistance'), icon: Heart, path: slug ? `/family/${slug}/assistance` : '/dashboard', tone: 'bg-accent/20 text-accent-foreground' },
    { label: t('mobileHome.reports'), icon: TrendingUp, path: slug ? `/family/${slug}/reports` : '/dashboard', tone: 'bg-secondary/25 text-foreground' },
    { label: t('mobileHome.more'), icon: Building2, path: slug ? `/family/${slug}/more` : '/dashboard', tone: 'bg-muted text-foreground' },
  ];

  if (loading) {
    return (
      <MobileLayout showHeader={false} showBottomNav={false}>
        <DashboardSkeleton />
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showHeader={false} familySlug={slug}>
      <OfflineIndicator />
      <PullToRefresh pullDistance={pullDistance} isRefreshing={isRefreshing} />

      <div
        {...handlers}
        className="relative"
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transition: pullDistance === 0 ? 'transform 0.2s ease-out' : undefined,
        }}
      >
        {/* Curved branded header */}
        <header
          className="relative overflow-hidden bg-primary text-primary-foreground rounded-b-[2rem] px-5 pb-6 shadow-lg"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
        >
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-primary-foreground/10" />
          <div aria-hidden className="pointer-events-none absolute right-16 top-20 h-24 w-24 rounded-full bg-accent/20" />

          <div className="relative flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Kinsroot</h1>
            <button
              aria-label={t('mobileHome.notifications')}
              onClick={() => slug && go(`/family/${slug}/notifications`)}
              className="relative flex h-11 w-11 items-center justify-center rounded-full bg-primary-foreground/10 active:scale-95 transition-transform"
            >
              <Bell className="h-6 w-6" />
              <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-primary" />
            </button>
          </div>

          {userFamilies.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative mt-4 flex w-full items-center gap-2 text-left">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-lg font-semibold">
                      {selectedFamily?.family_name || t('mobileHome.selectFamily')}
                    </span>
                    <span className="block text-xs capitalize opacity-80">
                      {selectedFamily?.user_role.replace(/_/g, ' ')}
                    </span>
                  </span>
                  {userFamilies.length > 1 && <ChevronDown className="h-5 w-5 shrink-0" />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72">
                {userFamilies.map((family) => (
                  <DropdownMenuItem key={family.family_id} onClick={() => handleFamilyChange(family)} className="py-3">
                    <div className="flex w-full items-center gap-3">
                      <Building2 className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium">{family.family_name}</p>
                        <p className="text-xs capitalize text-muted-foreground">{family.user_role.replace(/_/g, ' ')}</p>
                      </div>
                      {selectedFamily?.family_id === family.family_id && <CheckCircle className="h-4 w-4 text-primary" />}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <form
            className="relative mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (slug) go(`/family/${slug}/members`);
            }}
          >
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder={t('mobileHome.search')}
              aria-label={t('mobileHome.search')}
              className="h-12 w-full rounded-2xl bg-card pl-12 pr-4 text-base text-foreground placeholder:text-muted-foreground shadow-sm outline-none focus:ring-2 focus:ring-accent"
            />
          </form>
        </header>

        <div className="space-y-7 px-4 pt-6 pb-4">
          {/* Quick actions */}
          <section>
            <h2 className="mb-3 px-1 text-xl font-bold text-foreground">{t('mobileHome.quickActions')}</h2>
            <div className="grid grid-cols-4 gap-x-2 gap-y-4">
              {tiles.map((tile) => {
                const Icon = tile.icon;
                return (
                  <button
                    key={tile.label}
                    onClick={() => go(tile.path)}
                    className="flex min-h-[88px] flex-col items-center gap-2 active:scale-95 transition-transform"
                  >
                    <span className={cn('flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm', tile.tone)}>
                      <Icon className="h-7 w-7" />
                    </span>
                    <span className="text-center text-xs font-medium leading-tight text-foreground">{tile.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Highlight cards */}
          <section className="grid grid-cols-2 gap-3">
            <Card
              onClick={() => slug && go(`/family/${slug}/payment-proofs`)}
              className="flex min-h-[96px] cursor-pointer items-center gap-3 rounded-2xl p-4 shadow-md active:scale-[0.98] transition-transform"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-accent-foreground">
                <AlertCircle className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{t('mobileHome.dues')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('mobileHome.pendingCount', { count: stats.pendingContributions })}
                </p>
              </div>
            </Card>
            <Card
              onClick={() => slug && go(`/family/${slug}/meetings`)}
              className="flex min-h-[96px] cursor-pointer items-center gap-3 rounded-2xl p-4 shadow-md active:scale-[0.98] transition-transform"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Calendar className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{t('mobileHome.nextMeeting')}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {stats.nextMeetingDate ? format(new Date(stats.nextMeetingDate), 'EEE, MMM d') : t('mobileHome.noneScheduled')}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Card>
          </section>

          {/* Savings summary */}
          <Card className="flex items-center justify-between rounded-2xl bg-secondary/20 p-4">
            <div>
              <p className="text-xs text-muted-foreground">{t('mobileHome.mySavings')}</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalSavings.toLocaleString()} FCFA</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{t('mobileHome.activeLoans')}</p>
              <p className="text-2xl font-bold text-foreground">{stats.activeLoans}</p>
            </div>
          </Card>

          {/* Recent activity */}
          <section>
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-xl font-bold text-foreground">{t('mobileHome.recentActivity')}</h2>
              <button
                onClick={() => slug && go(`/family/${slug}/notifications`)}
                className="min-h-[44px] px-2 text-sm font-semibold text-primary"
              >
                {t('mobileHome.seeAll')}
              </button>
            </div>
            {activities.length > 0 ? (
              <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
                {activities.map((activity) => {
                  const Icon = activity.icon;
                  return (
                    <Card key={activity.id} className="w-60 shrink-0 snap-start overflow-hidden rounded-2xl shadow-md">
                      <div className="flex h-24 items-center justify-center bg-primary text-primary-foreground">
                        <Icon className="h-10 w-10 opacity-90" />
                      </div>
                      <div className="p-3">
                        <p className="truncate text-sm font-semibold capitalize text-foreground">{activity.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{activity.description}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="rounded-2xl p-8 text-center text-muted-foreground">
                <Clock className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p className="text-sm">{t('mobileHome.noActivity')}</p>
              </Card>
            )}
          </section>
        </div>
      </div>
    </MobileLayout>
  );
}

export default MobileDashboard;

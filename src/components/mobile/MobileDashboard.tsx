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
} from 'lucide-react';
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

  const quickActions = [
    {
      label: 'Pay',
      icon: Wallet,
      path: selectedFamily ? `/family/${selectedFamily.family_slug}/contributions` : '/dashboard',
      color: 'bg-primary text-primary-foreground',
    },
    {
      label: 'Check-in',
      icon: QrCode,
      path: selectedFamily ? `/family/${selectedFamily.family_slug}/meetings` : '/dashboard',
      color: 'bg-secondary text-secondary-foreground',
    },
    {
      label: 'Loan',
      icon: HandCoins,
      path: selectedFamily ? `/family/${selectedFamily.family_slug}/loans` : '/dashboard',
      color: 'bg-accent text-accent-foreground',
    },
    {
      label: 'Savings',
      icon: PiggyBank,
      path: selectedFamily ? `/family/${selectedFamily.family_slug}/savings` : '/dashboard',
      color: 'bg-muted text-foreground',
    },
  ];

  if (loading) {
    return (
      <MobileLayout title="Kinsroot" showBottomNav={false}>
        <DashboardSkeleton />
      </MobileLayout>
    );
  }

  return (
    <MobileLayout
      title="Kinsroot"
      familySlug={selectedFamily?.family_slug}
      showSearch={false}
    >
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
        <div className="p-4 space-y-6">
          {/* Family Selector */}
          {userFamilies.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Card className="p-4 cursor-pointer active:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">
                        {selectedFamily?.family_name || 'Select Family'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedFamily?.user_role.replace('_', ' ')}
                      </p>
                    </div>
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  </div>
                </Card>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72">
                {userFamilies.map((family) => (
                  <DropdownMenuItem
                    key={family.family_id}
                    onClick={() => handleFamilyChange(family)}
                    className="py-3"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <Building2 className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium">{family.family_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {family.user_role.replace('_', ' ')}
                        </p>
                      </div>
                      {selectedFamily?.family_id === family.family_id && (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-xl font-bold">{stats.pendingContributions}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <PiggyBank className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Savings</p>
                  <p className="text-xl font-bold">
                    {(stats.totalSavings / 1000).toFixed(0)}K
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <HandCoins className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Active Loans</p>
                  <p className="text-xl font-bold">{stats.activeLoans}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Meetings</p>
                  <p className="text-xl font-bold">{stats.upcomingMeetings}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Next Meeting Banner */}
          {stats.nextMeetingDate && (
            <Card
              className="p-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground cursor-pointer"
              onClick={async () => {
                await haptics.light();
                navigate(`/family/${selectedFamily?.family_slug}/meetings`);
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-8 w-8" />
                  <div>
                    <p className="text-sm opacity-90">Next Meeting</p>
                    <p className="font-semibold">
                      {format(new Date(stats.nextMeetingDate), 'EEEE, MMM d')}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5" />
              </div>
            </Card>
          )}

          {/* Quick Actions */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
              Quick Actions
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Card
                    key={action.label}
                    className={cn(
                      'p-3 flex flex-col items-center gap-2 cursor-pointer',
                      'active:scale-95 transition-transform'
                    )}
                    onClick={async () => {
                      await haptics.light();
                      navigate(action.path);
                    }}
                  >
                    <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center', action.color)}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-medium">{action.label}</span>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-sm font-semibold text-muted-foreground">
                Recent Activity
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-auto py-1"
                onClick={async () => {
                  await haptics.light();
                  navigate(`/family/${selectedFamily?.family_slug}/audit-trail`);
                }}
              >
                View All
              </Button>
            </div>
            <Card className="divide-y divide-border">
              {activities.length > 0 ? (
                activities.map((activity) => {
                  const Icon = activity.icon;
                  return (
                    <div key={activity.id} className="flex items-start gap-3 p-4">
                      <div className={cn('h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0', activity.iconBg)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{activity.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {activity.description}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}

export default MobileDashboard;

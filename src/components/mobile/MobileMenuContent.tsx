import { useNavigate } from 'react-router-dom';
import {
  Home,
  Users,
  Calendar,
  Wallet,
  PiggyBank,
  HandCoins,
  HeartHandshake,
  BarChart3,
  Settings,
  LogOut,
  User,
  ChevronRight,
  MessageCircle,
  CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MenuItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: number;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

interface MobileMenuContentProps {
  familySlug?: string;
  userName?: string;
  userAvatar?: string;
  userEmail?: string;
}

export function MobileMenuContent({
  familySlug,
  userName = 'User',
  userAvatar,
  userEmail,
}: MobileMenuContentProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const menuSections: MenuSection[] = [
    {
      title: 'Main',
      items: [
        { label: 'Dashboard', icon: Home, path: familySlug ? `/family/${familySlug}` : '/dashboard' },
        { label: 'Members', icon: Users, path: familySlug ? `/family/${familySlug}/members` : '/dashboard' },
        { label: 'Meetings', icon: Calendar, path: familySlug ? `/family/${familySlug}/meetings` : '/dashboard' },
      ],
    },
    {
      title: 'Finance',
      items: [
        { label: 'Contributions', icon: Wallet, path: familySlug ? `/family/${familySlug}/contributions` : '/dashboard' },
        { label: 'Savings', icon: PiggyBank, path: familySlug ? `/family/${familySlug}/savings` : '/dashboard' },
        { label: 'Loans', icon: HandCoins, path: familySlug ? `/family/${familySlug}/loans` : '/dashboard' },
        { label: 'Njangi', icon: HeartHandshake, path: familySlug ? `/family/${familySlug}/njangi` : '/dashboard' },
      ],
    },
    {
      title: 'Community',
      items: [
        { label: 'Chat', icon: MessageCircle, path: familySlug ? `/family/${familySlug}/chat` : '/dashboard' },
        { label: 'Calendar', icon: CalendarDays, path: familySlug ? `/family/${familySlug}/calendar` : '/dashboard' },
      ],
    },
    {
      title: 'Reports',
      items: [
        { label: 'Analytics', icon: BarChart3, path: familySlug ? `/family/${familySlug}/analytics` : '/dashboard' },
      ],
    },
  ];

  const handleNavigate = async (path: string) => {
    await haptics.light();
    navigate(path);
  };

  const handleLogout = async () => {
    await haptics.medium();
    try {
      await supabase.auth.signOut();
      toast({ title: 'Signed out successfully' });
      navigate('/auth');
    } catch (error) {
      toast({ title: 'Error signing out', variant: 'destructive' });
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* User Profile Section */}
      <div className="p-4 bg-primary text-primary-foreground">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-primary-foreground/20">
            <AvatarImage src={userAvatar} alt={userName} />
            <AvatarFallback className="bg-secondary text-secondary-foreground">
              {userName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{userName}</p>
            {userEmail && (
              <p className="text-sm text-primary-foreground/70 truncate">
                {userEmail}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {menuSections.map((section, sectionIndex) => (
            <div key={section.title}>
              <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {section.title}
              </p>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigate(item.path)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-3 rounded-lg',
                      'text-foreground hover:bg-muted',
                      'transition-colors duration-200'
                    )}
                  >
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <span className="flex-1 text-left font-medium">
                      {item.label}
                    </span>
                    {item.badge && item.badge > 0 && (
                      <span className="h-5 min-w-[20px] px-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-full flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                );
              })}
              {sectionIndex < menuSections.length - 1 && (
                <Separator className="my-2" />
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Bottom Actions */}
      <div className="p-2 border-t border-border">
        <button
          onClick={() => handleNavigate('/profile')}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-3 rounded-lg',
            'text-foreground hover:bg-muted',
            'transition-colors duration-200'
          )}
        >
          <User className="h-5 w-5 text-muted-foreground" />
          <span className="flex-1 text-left font-medium">Profile</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>

        <button
          onClick={() => handleNavigate(familySlug ? `/family/${familySlug}/settings` : '/settings')}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-3 rounded-lg',
            'text-foreground hover:bg-muted',
            'transition-colors duration-200'
          )}
        >
          <Settings className="h-5 w-5 text-muted-foreground" />
          <span className="flex-1 text-left font-medium">Settings</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>

        <Separator className="my-2" />

        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-3 rounded-lg',
            'text-destructive hover:bg-destructive/10',
            'transition-colors duration-200'
          )}
        >
          <LogOut className="h-5 w-5" />
          <span className="flex-1 text-left font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
}

export default MobileMenuContent;

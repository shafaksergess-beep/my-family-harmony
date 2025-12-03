import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, Calendar, Wallet, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: number;
}

interface MobileBottomNavProps {
  familySlug?: string;
  className?: string;
}

export function MobileBottomNav({ familySlug, className }: MobileBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems: NavItem[] = [
    {
      label: 'Home',
      icon: Home,
      path: familySlug ? `/family/${familySlug}` : '/dashboard',
    },
    {
      label: 'Members',
      icon: Users,
      path: familySlug ? `/family/${familySlug}/members` : '/dashboard',
    },
    {
      label: 'Meetings',
      icon: Calendar,
      path: familySlug ? `/family/${familySlug}/meetings` : '/dashboard',
    },
    {
      label: 'Finance',
      icon: Wallet,
      path: familySlug ? `/family/${familySlug}/contributions` : '/dashboard',
    },
    {
      label: 'More',
      icon: MoreHorizontal,
      path: familySlug ? `/family/${familySlug}/more` : '/dashboard',
    },
  ];

  const handleNavClick = async (path: string) => {
    await haptics.selection();
    navigate(path);
  };

  const isActive = (path: string) => {
    if (path === `/family/${familySlug}` || path === '/dashboard') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-card border-t border-border',
        'safe-area-bottom',
        className
      )}
    >
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={cn(
                'flex flex-col items-center justify-center',
                'w-16 h-14 rounded-lg',
                'transition-colors duration-200',
                active
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    'h-5 w-5 mb-1',
                    active && 'text-primary'
                  )}
                />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 h-4 w-4 bg-destructive text-destructive-foreground text-[10px] font-medium rounded-full flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default MobileBottomNav;

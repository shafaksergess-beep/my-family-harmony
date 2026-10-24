import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { usePlatform } from '@/hooks/usePlatform';
import { MobileHeader } from './MobileHeader';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileMenuContent } from './MobileMenuContent';

interface MobileLayoutProps {
  children: ReactNode;
  title?: string;
  familySlug?: string;
  showHeader?: boolean;
  showBottomNav?: boolean;
  showSearch?: boolean;
  showNotifications?: boolean;
  notificationCount?: number;
  onSearchChange?: (value: string) => void;
  className?: string;
  contentClassName?: string;
}

export function MobileLayout({
  children,
  title = 'Kinsroot',
  familySlug,
  showHeader = true,
  showBottomNav = true,
  showSearch = true,
  showNotifications = true,
  notificationCount = 0,
  onSearchChange,
  className,
  contentClassName,
}: MobileLayoutProps) {
  const navigate = useNavigate();
  const { isMobile, safeAreaTop, safeAreaBottom } = usePlatform();

  // Only render mobile layout on mobile devices
  if (!isMobile) {
    return <>{children}</>;
  }

  const handleNotificationClick = () => {
    if (familySlug) {
      navigate(`/family/${familySlug}/notifications`);
    }
  };

  return (
    <div
      className={cn(
        'min-h-dvh min-w-0 bg-background flex flex-col',
        className
      )}
      style={{
        paddingTop: showHeader && safeAreaTop > 0 ? `${safeAreaTop}px` : undefined,
      }}
    >
      {showHeader && (
        <MobileHeader
          title={title}
          showSearch={showSearch}
          showNotifications={showNotifications}
          notificationCount={notificationCount}
          onSearchChange={onSearchChange}
          onNotificationClick={handleNotificationClick}
          menuContent={<MobileMenuContent familySlug={familySlug} />}
        />
      )}

      <main
        className={cn(
          'flex-1 min-w-0 max-w-full',
          showBottomNav && 'pb-20',
          contentClassName
        )}
        style={{
          paddingBottom: showBottomNav
            ? `calc(6rem + ${safeAreaBottom}px)`
            : safeAreaBottom > 0
            ? `${safeAreaBottom}px`
            : undefined,
        }}
      >
        {children}
      </main>

      {showBottomNav && <MobileBottomNav familySlug={familySlug} />}
    </div>
  );
}

export default MobileLayout;

import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { usePlatform } from '@/hooks/usePlatform';
import { MobileHeader } from './MobileHeader';
import { MobileBottomNav } from './MobileBottomNav';
import { useShellConfig } from '@/hooks/useShellConfig';
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
  const { isMobile } = usePlatform();
  const shell = useShellConfig();
  const ownNav = showBottomNav && !shell?.insideShell;

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
          ownNav && 'pb-[calc(4rem+env(safe-area-inset-bottom))]',
          contentClassName
        )}
      >
        {children}
      </main>

      {ownNav && <MobileBottomNav familySlug={familySlug} />}
    </div>
  );
}

export default MobileLayout;

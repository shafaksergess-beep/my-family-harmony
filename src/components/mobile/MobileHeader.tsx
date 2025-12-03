import { useState } from 'react';
import { Menu, Search, Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { SyncStatusIndicator } from './SyncStatusIndicator';

interface MobileHeaderProps {
  title?: string;
  showSearch?: boolean;
  showNotifications?: boolean;
  notificationCount?: number;
  onMenuClick?: () => void;
  onSearchChange?: (value: string) => void;
  onNotificationClick?: () => void;
  menuContent?: React.ReactNode;
  className?: string;
}

export function MobileHeader({
  title = 'Kinsroot',
  showSearch = true,
  showNotifications = true,
  notificationCount = 0,
  onMenuClick,
  onSearchChange,
  onNotificationClick,
  menuContent,
  className,
}: MobileHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const handleMenuClick = async () => {
    await haptics.light();
    onMenuClick?.();
  };

  const handleSearchToggle = async () => {
    await haptics.light();
    setIsSearchOpen(!isSearchOpen);
  };

  const handleNotificationClick = async () => {
    await haptics.medium();
    onNotificationClick?.();
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    onSearchChange?.(value);
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full bg-primary text-primary-foreground',
        'safe-area-top',
        className
      )}
    >
      <div className="flex h-14 items-center justify-between px-4">
        {/* Left: Menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-hover"
              onClick={handleMenuClick}
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            {menuContent}
          </SheetContent>
        </Sheet>

        {/* Center: Title or Search */}
        {isSearchOpen ? (
          <div className="flex-1 mx-2">
            <Input
              type="search"
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-9 bg-primary-foreground/10 border-0 text-primary-foreground placeholder:text-primary-foreground/60 focus-visible:ring-secondary"
              autoFocus
            />
          </div>
        ) : (
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <SyncStatusIndicator />
          
          {showSearch && (
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-hover"
              onClick={handleSearchToggle}
            >
              {isSearchOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Search className="h-5 w-5" />
              )}
              <span className="sr-only">
                {isSearchOpen ? 'Close search' : 'Open search'}
              </span>
            </Button>
          )}

          {showNotifications && (
            <Button
              variant="ghost"
              size="icon"
              className="relative text-primary-foreground hover:bg-primary-hover"
              onClick={handleNotificationClick}
            >
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {notificationCount > 99 ? '99+' : notificationCount}
                </Badge>
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

export default MobileHeader;

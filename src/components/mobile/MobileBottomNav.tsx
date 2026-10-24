import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, Calendar, Wallet, Plus, Receipt, QrCode, HandCoins, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

interface MobileBottomNavProps {
  familySlug?: string;
  className?: string;
}

export function MobileBottomNav({ familySlug, className }: MobileBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const base = familySlug ? `/family/${familySlug}` : null;
  const p = (sub: string) => (base ? `${base}${sub}` : '/dashboard');

  const left: NavItem[] = [
    { label: t("nav.home"), icon: Home, path: base ?? '/dashboard' },
    { label: t("nav.members"), icon: Users, path: p('/members') },
  ];
  const right: NavItem[] = [
    { label: t("nav.meetings"), icon: Calendar, path: p('/meetings') },
    { label: t("nav.finance"), icon: Wallet, path: p('/contributions') },
  ];
  const actions = [
    { label: t('mobileHome.submitProof'), icon: Receipt, path: p('/payment-proofs') },
    { label: t('mobileHome.scanQr'), icon: QrCode, path: p('/meetings') },
    { label: t('mobileHome.requestLoan'), icon: HandCoins, path: p('/loans') },
    { label: t('mobileHome.requestAssistance'), icon: Heart, path: p('/assistance') },
  ];

  const go = async (path: string) => {
    await haptics.selection();
    setOpen(false);
    navigate(path);
  };

  const isActive = (path: string) => {
    if (path === base || path === '/dashboard') return location.pathname === path || location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    return (
      <button
        key={item.label}
        onClick={() => go(item.path)}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'relative flex min-w-0 h-14 flex-1 flex-col items-center justify-center gap-1 transition-colors',
          active ? 'text-primary' : 'text-muted-foreground'
        )}
      >
        <Icon className="h-6 w-6" />
        <span className={cn('max-w-full px-1 text-center text-[11px] leading-tight', active ? 'font-semibold' : 'font-medium')}>{item.label}</span>
        {active && <span className="absolute bottom-0 h-1 w-6 rounded-full bg-primary" />}
      </button>
    );
  };

  return (
    <>
      <nav
        className={cn('fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card shadow-[0_-4px_20px_-8px_hsl(var(--foreground)/0.15)]', className)}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex h-16 items-center px-2">
          {left.map(renderItem)}
          <div className="flex flex-1 justify-center">
            <button
              aria-label={t('mobileHome.actions')}
              onClick={async () => { await haptics.light(); setOpen(true); }}
              className="-mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-card active:scale-95 transition-transform"
            >
              <Plus className="h-8 w-8" />
            </button>
          </div>
          {right.map(renderItem)}
        </div>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <SheetHeader>
            <SheetTitle>{t('mobileHome.actions')}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {actions.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.label}
                  onClick={() => go(a.path)}
                  className="flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-2xl bg-muted p-3 text-center text-sm font-medium text-foreground active:scale-95 transition-transform"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </span>
                  {a.label}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default MobileBottomNav;

import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { ShareAppButton } from "@/components/settings/AppSupport";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from 'react-router-dom';
import {
  PiggyBank,
  HandCoins,
  HeartHandshake,
  BarChart3,
  FileText,
  Download,
  Settings,
  Bell,
  HelpCircle,
  ChevronRight,
  Share2,
  Wallet,
  CalendarDays,
  Users,
  Heart,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { useFamilyAuth } from '@/hooks/useFamilyAuth';
import { useFamilyModules } from '@/hooks/useFamilyModules';

interface MenuItem {
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  moduleSlug?: string;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export default function More() {
  const { t } = useTranslation();
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { family, isFamilyHead, isFamilyAdmin } = useFamilyAuth(familySlug);
  const { isModuleEnabled } = useFamilyModules(family?.id);

  const canManageFamily = isFamilyHead || isFamilyAdmin;

  const menuSections: MenuSection[] = [
    {
      title: 'Financial',
      items: [
        { label: 'Savings', description: 'Personal savings accounts', icon: PiggyBank, path: `/family/${familySlug}/savings`, moduleSlug: 'savings' },
        { label: 'Njangi', description: 'Rotating savings circles', icon: HeartHandshake, path: `/family/${familySlug}/njangi`, moduleSlug: 'njangi' },
        { label: 'Loans', description: 'Loan applications & tracking', icon: HandCoins, path: `/family/${familySlug}/loans`, moduleSlug: 'loans' },
        { label: 'Shares & Dividends', description: 'Family shareholding', icon: Wallet, path: `/family/${familySlug}/shares`, moduleSlug: 'shares' },
      ],
    },
    {
      title: 'Assistance',
      items: [
        { label: 'Assistance Events', description: 'Birth, death, sickness support', icon: Heart, path: `/family/${familySlug}/assistance`, moduleSlug: 'assistance' },
        { label: 'Balloting', description: 'Fair allocation system', icon: CalendarDays, path: `/family/${familySlug}/balloting`, moduleSlug: 'balloting' },
      ],
    },
    {
      title: 'Analytics & Reports',
      items: [
        { label: 'Analytics Dashboard', description: 'Financial insights', icon: BarChart3, path: `/family/${familySlug}/analytics`, moduleSlug: 'analytics' },
        { label: 'PDF Reports', description: 'Generate detailed reports', icon: FileText, path: `/family/${familySlug}/pdf-reports`, moduleSlug: 'pdf-reports' },
        { label: 'Export Data', description: 'Download your data', icon: Download, path: `/family/${familySlug}/export-scheduler`, moduleSlug: 'export-scheduler' },
      ],
    },
    // Settings section only visible to family head and family admin
    ...(canManageFamily ? [{
      title: 'Settings',
      items: [
        { label: 'Notifications', description: 'Manage alerts & reminders', icon: Bell, path: `/family/${familySlug}/notifications` },
        { label: 'Notification Settings', description: 'Customize preferences', icon: Settings, path: `/family/${familySlug}/notification-settings` },
        { label: 'Invitations & Requests', description: 'Manage invites & join requests', icon: UserPlus, path: `/family/${familySlug}/invitations` },
        { label: t('moduleSettings.menuLabel'), description: t('moduleSettings.menuDescription'), icon: Settings, path: `/family/${familySlug}/module-settings` },
      ],
    }] : []),
  ];

  // Hide modules the family has switched off in Module Settings.
  const visibleSections = menuSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.moduleSlug || isModuleEnabled(item.moduleSlug),
      ),
    }))
    .filter((section) => section.items.length > 0);

  const handleNavigate = async (path: string) => {
    await haptics.light();
    navigate(path);
  };

  return (
    <MobileLayout
      title={t("famMore.more")}
      familySlug={familySlug}
      showSearch={false}
    >
      <ScrollArea className="h-full">
        <div className="p-4 space-y-6">
          <ThemeToggle />
          <Button variant="outline" className="w-full justify-between" onClick={() => navigate('/profile')}>{t('phase6.profileSettings')}<ChevronRight className="h-5 w-5" /></Button>
          {visibleSections.map((section, sectionIndex) => (
            <div key={section.title}>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                {section.title}
              </h2>
              <div className="bg-card rounded-xl overflow-hidden border border-border">
                {section.items.map((item, itemIndex) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.path}>
                      <button
                        onClick={() => handleNavigate(item.path)}
                        className={cn(
                          'w-full flex items-center gap-4 p-4',
                          'text-foreground hover:bg-muted/50 active:bg-muted',
                          'transition-colors duration-200'
                        )}
                      >
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="font-medium truncate">{item.label}</p>
                          {item.description && (
                            <p className="text-sm text-muted-foreground truncate">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      </button>
                      {itemIndex < section.items.length - 1 && (
                        <Separator className="ml-[4.5rem]" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => handleNavigate('/install')}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl',
                'bg-primary text-primary-foreground',
                'active:opacity-80 transition-opacity'
              )}
            >
              <Download className="h-6 w-6" />
              <span className="text-sm font-medium">{t("famMore.installApp")}</span>
            </button>
            <ShareAppButton className="h-auto min-h-24 min-w-0 flex-col gap-2 whitespace-normal bg-secondary p-4 text-secondary-foreground" />
          </div>

          {/* Help */}
          <button
            onClick={() => handleNavigate('/profile')}
            className={cn(
              'w-full flex items-center gap-4 p-4 rounded-xl',
              'bg-muted/50 text-foreground',
              'active:bg-muted transition-colors'
            )}
          >
            <HelpCircle className="h-6 w-6 text-muted-foreground" />
            <span className="font-medium">{t("famMore.helpSupport")}</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground ml-auto" />
          </button>
        </div>
      </ScrollArea>
    </MobileLayout>
  );
}

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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MobileLayout } from '@/components/mobile/MobileLayout';

interface MenuItem {
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export default function More() {
  const { familySlug } = useParams();
  const navigate = useNavigate();

  const menuSections: MenuSection[] = [
    {
      title: 'Financial',
      items: [
        { label: 'Savings', description: 'Personal savings accounts', icon: PiggyBank, path: `/family/${familySlug}/savings` },
        { label: 'Njangi', description: 'Rotating savings circles', icon: HeartHandshake, path: `/family/${familySlug}/njangi` },
        { label: 'Loans', description: 'Loan applications & tracking', icon: HandCoins, path: `/family/${familySlug}/loans` },
        { label: 'Shares & Dividends', description: 'Family shareholding', icon: Wallet, path: `/family/${familySlug}/shares` },
      ],
    },
    {
      title: 'Assistance',
      items: [
        { label: 'Assistance Events', description: 'Birth, death, sickness support', icon: Heart, path: `/family/${familySlug}/assistance` },
        { label: 'Balloting', description: 'Fair allocation system', icon: CalendarDays, path: `/family/${familySlug}/balloting` },
      ],
    },
    {
      title: 'Analytics & Reports',
      items: [
        { label: 'Analytics Dashboard', description: 'Financial insights', icon: BarChart3, path: `/family/${familySlug}/analytics` },
        { label: 'PDF Reports', description: 'Generate detailed reports', icon: FileText, path: `/family/${familySlug}/pdf-reports` },
        { label: 'Export Data', description: 'Download your data', icon: Download, path: `/family/${familySlug}/export-scheduler` },
      ],
    },
    {
      title: 'Settings',
      items: [
        { label: 'Notifications', description: 'Manage alerts & reminders', icon: Bell, path: `/family/${familySlug}/notifications` },
        { label: 'Notification Settings', description: 'Customize preferences', icon: Settings, path: `/family/${familySlug}/notification-settings` },
        { label: 'Invitations', description: 'Invite family members', icon: Users, path: `/family/${familySlug}/invitations` },
      ],
    },
  ];

  const handleNavigate = async (path: string) => {
    await haptics.light();
    navigate(path);
  };

  return (
    <MobileLayout
      title="More"
      familySlug={familySlug}
      showSearch={false}
    >
      <ScrollArea className="h-full">
        <div className="p-4 space-y-6">
          {menuSections.map((section, sectionIndex) => (
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
              <span className="text-sm font-medium">Install App</span>
            </button>
            <button
              onClick={async () => {
                await haptics.medium();
                if (navigator.share) {
                  navigator.share({
                    title: 'Kinsroot',
                    text: 'Join our family on Kinsroot!',
                    url: window.location.origin,
                  });
                }
              }}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl',
                'bg-secondary text-secondary-foreground',
                'active:opacity-80 transition-opacity'
              )}
            >
              <Share2 className="h-6 w-6" />
              <span className="text-sm font-medium">Share App</span>
            </button>
          </div>

          {/* Help */}
          <button
            onClick={() => handleNavigate('/help')}
            className={cn(
              'w-full flex items-center gap-4 p-4 rounded-xl',
              'bg-muted/50 text-foreground',
              'active:bg-muted transition-colors'
            )}
          >
            <HelpCircle className="h-6 w-6 text-muted-foreground" />
            <span className="font-medium">Help & Support</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground ml-auto" />
          </button>
        </div>
      </ScrollArea>
    </MobileLayout>
  );
}

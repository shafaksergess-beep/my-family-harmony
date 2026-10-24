import * as React from 'react';
import { useDevice } from '@/hooks/useDevice';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
export const SegmentedTabs = Tabs;
export const SegmentedTabsContent = TabsContent;
export const SegmentedTabsList = React.forwardRef<React.ElementRef<typeof TabsList>, React.ComponentPropsWithoutRef<typeof TabsList>>(({ className, ...props }, ref) => {
  const { isMobile } = useDevice();
  return <div className={cn('min-w-0', isMobile && 'fade-edges')}><TabsList ref={ref} className={cn(isMobile && 'snap-row !flex w-full !justify-start overflow-x-auto rounded-full', className)} {...props} /></div>;
});
SegmentedTabsList.displayName = 'SegmentedTabsList';
export const SegmentedTabsTrigger = React.forwardRef<React.ElementRef<typeof TabsTrigger>, React.ComponentPropsWithoutRef<typeof TabsTrigger>>(({ className, ...props }, ref) => <TabsTrigger ref={ref} className={cn('shrink-0 snap-start rounded-full', className)} {...props} />);
SegmentedTabsTrigger.displayName = 'SegmentedTabsTrigger';

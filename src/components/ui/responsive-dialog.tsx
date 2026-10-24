import * as React from 'react';
import { useDevice } from '@/hooks/useDevice';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogClose, DialogPortal, DialogOverlay, DialogFooter } from './dialog';
import { SheetContent } from './sheet';
export const ResponsiveDialog = Dialog;
export const ResponsiveDialogTrigger = DialogTrigger;
export const ResponsiveDialogClose = DialogClose;
export const ResponsiveDialogPortal = DialogPortal;
export const ResponsiveDialogOverlay = DialogOverlay;
export const ResponsiveDialogHeader = DialogHeader;
export const ResponsiveDialogTitle = DialogTitle;
export const ResponsiveDialogDescription = DialogDescription;
export const ResponsiveDialogContent = React.forwardRef<React.ElementRef<typeof DialogContent>, React.ComponentPropsWithoutRef<typeof DialogContent>>(({ children, className, ...props }, ref) => {
  const { isMobile } = useDevice();
  if (!isMobile) return <DialogContent ref={ref} className={className} {...props}>{children}</DialogContent>;
  return <SheetContent ref={ref} side="bottom" className={cn('responsive-dialog !max-w-full !max-h-[90dvh] !overflow-hidden rounded-t-2xl p-0', className)} {...props}>
    <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-border" aria-hidden="true" />
    <div className="responsive-dialog-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4">{children}</div>
  </SheetContent>;
});
ResponsiveDialogContent.displayName = 'ResponsiveDialogContent';
export function ResponsiveDialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn('min-w-0 py-4', className)} {...props} />; }
export function ResponsiveDialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { isMobile } = useDevice();
  return <DialogFooter className={cn(isMobile && 'sticky bottom-0 z-10 border-t border-border bg-background pt-3 pb-safe', className)} {...props} />;
}

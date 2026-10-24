import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Share2, Star, Compass } from 'lucide-react';
import { useDevice } from '@/hooks/useDevice';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription, ResponsiveDialogFooter } from '@/components/ui/responsive-dialog';
import { NewUserOnboarding } from '@/components/onboarding/NewUserOnboarding';
import { canRateApp, INSTALL_URL, markTourSeen, rateApp, shareApp, SUPPORT_EMAIL } from '@/lib/mobileExperience';
import { nativelyBridge } from '@/lib/natively';
import { useToast } from '@/hooks/use-toast';

export function ShareAppButton({ className }: { className?: string }) {
  const { t } = useTranslation(); const { toast } = useToast();
  const [open, setOpen] = useState(false); const [text, setText] = useState(''); const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      const result = await shareApp(text, { share: navigator.share ? data => navigator.share(data) : undefined, copy: value => nativelyBridge.copyToClipboard(value) });
      if (result === 'copied') toast({ title: t('phase6.copied') });
      if (result !== 'cancelled') setOpen(false);
    } catch { toast({ title: t('phase6.shareFailed'), variant: 'destructive' }); }
    finally { setBusy(false); }
  };
  return <>
    <Button variant="outline" className={className ?? 'w-full justify-start gap-3'} onClick={() => { setText(t('phase6.shareMessage')); setOpen(true); }}><Share2 className="h-5 w-5 shrink-0" />{t('phase6.share')}</Button>
    <ResponsiveDialog open={open} onOpenChange={setOpen}><ResponsiveDialogContent className="sm:max-w-md"><ResponsiveDialogHeader><ResponsiveDialogTitle>{t('phase6.share')}</ResponsiveDialogTitle><ResponsiveDialogDescription>{t('phase6.shareDescription')}</ResponsiveDialogDescription></ResponsiveDialogHeader><div className="space-y-3 py-4"><Label htmlFor="app-share-message">{t('phase6.message')}</Label><Textarea id="app-share-message" value={text} onChange={e => setText(e.target.value)} rows={4} /><p className="break-all text-sm text-muted-foreground">{INSTALL_URL}</p></div><ResponsiveDialogFooter><Button variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button><Button disabled={busy} onClick={() => void send()}><Share2 className="mr-2 h-4 w-4" />{t('phase6.share')}</Button></ResponsiveDialogFooter></ResponsiveDialogContent></ResponsiveDialog>
  </>;
}
export function AppSupport({ userId, financeRole }: { userId: string; financeRole: boolean }) {
  const { t } = useTranslation(); const { isAndroid } = useDevice(); const [tourOpen, setTourOpen] = useState(false);
  const rate = () => rateApp({
    openMarket: url => nativelyBridge.openPlayStore(url),
    openWeb: url => nativelyBridge.openWindow(url, true),
    schedule: callback => { window.setTimeout(() => { if (document.visibilityState === 'visible') callback(); }, 1200); },
  });
  return <>
    <Card><CardHeader><CardTitle>{t('phase6.support')}</CardTitle></CardHeader><CardContent className="space-y-2">
      <Button variant="outline" className="w-full justify-start gap-3" onClick={() => setTourOpen(true)}><Compass className="h-5 w-5 shrink-0" />{t('phase6.replay')}</Button>
      {canRateApp(isAndroid) && <Button variant="outline" className="w-full justify-start gap-3" onClick={rate}><Star className="h-5 w-5 shrink-0" />{t('phase6.rate')}</Button>}
      <ShareAppButton />
      <Button variant="outline" className="w-full justify-start gap-3" asChild><a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t('phase6.feedbackSubject'))}&body=${encodeURIComponent(t('phase6.feedbackBody'))}`}><MessageSquare className="h-5 w-5 shrink-0" />{t('phase6.feedback')}</a></Button>
    </CardContent></Card>
    <NewUserOnboarding open={tourOpen} financeRole={financeRole} onComplete={() => { setTourOpen(false); try { markTourSeen(window.localStorage, userId); } catch { /* Storage unavailable. */ } }} />
  </>;
}

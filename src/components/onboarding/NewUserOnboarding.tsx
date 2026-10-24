import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Calendar, Wallet, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription, ResponsiveDialogFooter } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface NewUserOnboardingProps { open: boolean; onComplete: () => void; userName?: string; financeRole?: boolean; }
export function NewUserOnboarding({ open, onComplete, financeRole = false }: NewUserOnboardingProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const steps = [ { key: 'welcome', icon: Users }, { key: 'meetings', icon: Calendar }, { key: financeRole ? 'review' : 'payments', icon: Wallet }, { key: 'ready', icon: CheckCircle } ];
  const step = steps[currentStep];
  const Icon = step.icon;
  const finish = () => { setCurrentStep(0); onComplete(); };
  return <ResponsiveDialog open={open} onOpenChange={value => { if (!value) finish(); }}>
    <ResponsiveDialogContent className="sm:max-w-md">
      <ResponsiveDialogHeader>
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-6 w-6" /></div>
        <ResponsiveDialogTitle>{t(`phase6.tour.${step.key}Title`)}</ResponsiveDialogTitle>
        <ResponsiveDialogDescription>{t(`phase6.tour.${step.key}Body`)}</ResponsiveDialogDescription>
      </ResponsiveDialogHeader>
      <div className="space-y-2 py-5"><p className="text-sm text-muted-foreground">{t('phase6.tour.step', { current: currentStep + 1, total: steps.length })}</p><Progress value={(currentStep + 1) / steps.length * 100} /></div>
      <ResponsiveDialogFooter className="flex-row flex-wrap gap-2">
        <Button variant="outline" size="icon" aria-label={t('common.back')} disabled={currentStep === 0} onClick={() => setCurrentStep(s => s - 1)}><ArrowLeft className="h-4 w-4" /></Button>
        <Button variant="ghost" onClick={finish}>{t('phase6.tour.skip')}</Button>
        <Button className="ml-auto" onClick={() => currentStep === steps.length - 1 ? finish() : setCurrentStep(s => s + 1)}>{t(currentStep === steps.length - 1 ? 'phase6.tour.done' : 'phase6.tour.next')}<ArrowRight className="ml-2 h-4 w-4" /></Button>
      </ResponsiveDialogFooter>
    </ResponsiveDialogContent>
  </ResponsiveDialog>;
}

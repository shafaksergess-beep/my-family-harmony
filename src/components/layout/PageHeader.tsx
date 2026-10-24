import { useState, type ReactNode, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MoreVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDevice } from '@/hooks/useDevice';
import { useShellConfig } from '@/hooks/useShellConfig';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription } from '@/components/ui/responsive-dialog';
export interface HeaderAction { key: string; label: string; icon?: ComponentType<{ className?: string }>; onClick: () => void; variant?: ButtonProps['variant']; primary?: boolean; hidden?: boolean; disabled?: boolean }
export interface PageHeaderProps { title: string; subtitle?: string; backTo?: string | true; badge?: ReactNode; actions?: HeaderAction[] }
export function PageHeader({ title, subtitle, backTo, badge, actions = [] }: PageHeaderProps) {
  const { isMobile } = useDevice(); const shell = useShellConfig(); const navigate = useNavigate(); const { t } = useTranslation(); const [open, setOpen] = useState(false);
  const visible = actions.filter(a => !a.hidden); const primary = visible.find(a => a.primary); const more = visible.filter(a => a !== primary);
  const back = () => backTo === true ? navigate(-1) : backTo && navigate(backTo);
  const renderAction = (a: HeaderAction, iconOnly = false) => <Button key={a.key} variant={a.variant} size={iconOnly ? 'icon' : 'default'} disabled={a.disabled} aria-label={a.label} onClick={() => { setOpen(false); a.onClick(); }}>
    {a.icon && <a.icon className="h-5 w-5 shrink-0" />}{!iconOnly && <span>{a.label}</span>}{iconOnly && !a.icon && <span className="text-xs">{a.label.slice(0, 1)}</span>}
  </Button>;
  return <header className={isMobile ? 'page-header sticky top-0 z-40 border-b border-border bg-background pt-safe' : 'flex flex-wrap items-center justify-between gap-4'}>
    <div className={isMobile ? 'flex min-h-14 min-w-0 items-center gap-2 px-4' : 'flex min-w-0 items-center gap-4'}>
      {backTo && <Button variant="ghost" size="icon" aria-label={t('foundation.back')} onClick={back}><ChevronLeft className="h-5 w-5" /></Button>}
      <div className="min-w-0 flex-1"><h1 className={isMobile ? 'truncate text-lg font-semibold' : 'text-3xl font-bold'}>{shell?.config.title ?? title}</h1>{subtitle && <p className={isMobile ? 'truncate text-xs text-muted-foreground' : 'text-muted-foreground'}>{subtitle}</p>}</div>
      {badge && <div className="shrink-0">{badge}</div>}
      {isMobile && primary && <Tooltip><TooltipTrigger asChild>{renderAction(primary, true)}</TooltipTrigger><TooltipContent>{primary.label}</TooltipContent></Tooltip>}
      {isMobile && more.length > 0 && <Button size="icon" variant="ghost" aria-label={t('foundation.moreActions')} onClick={() => setOpen(true)}><MoreVertical className="h-5 w-5" /></Button>}
    </div>
    {!isMobile && <div className="flex flex-wrap items-center gap-2">{visible.map(a => renderAction(a))}</div>}
    <ResponsiveDialog open={open} onOpenChange={setOpen}><ResponsiveDialogContent><ResponsiveDialogHeader><ResponsiveDialogTitle>{t('foundation.moreActions')}</ResponsiveDialogTitle><ResponsiveDialogDescription className="sr-only">{title}</ResponsiveDialogDescription></ResponsiveDialogHeader><div className="flex flex-col gap-2 py-4">{more.map(a => renderAction(a))}</div></ResponsiveDialogContent></ResponsiveDialog>
  </header>;
}

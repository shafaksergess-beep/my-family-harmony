import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { t } = useTranslation();
  const { theme = 'system', setTheme } = useTheme();
  return <div className="min-w-0 space-y-3">
    <p className="font-medium text-foreground">{t('phase6.appearance')}</p>
    <div role="group" aria-label={t('phase6.appearance')} className="grid grid-cols-3 gap-2">
      {([{ key: 'system', icon: Monitor }, { key: 'light', icon: Sun }, { key: 'dark', icon: Moon }] as const).map(({ key, icon: Icon }) =>
        <Button key={key} variant={theme === key ? 'secondary' : 'outline'} aria-pressed={theme === key} className="h-auto min-h-11 min-w-0 flex-col gap-1 px-1 py-2 text-xs" onClick={() => setTheme(key)}><Icon className="h-4 w-4" />{t(`phase6.${key}`)}</Button>)}
    </div>
  </div>;
}

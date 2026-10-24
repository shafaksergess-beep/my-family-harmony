import { ManagementHeader } from "@/components/layout/ManagementMobile";
import { useTranslation } from "react-i18next";
import { NotificationPreferences } from '@/components/settings/NotificationPreferences';
import { ThemeToggle } from '@/components/settings/ThemeToggle';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Palette } from 'lucide-react';

export default function NotificationSettings() {
  const { t } = useTranslation();
  return (
    <div className="container mx-auto p-6 space-y-6">
      <ManagementHeader title={t("famNotificationSettings.settingsPreferences")} as="div">
        <h1 className="text-3xl font-bold mb-2">{t("famNotificationSettings.settingsPreferences")}</h1>
        <p className="text-muted-foreground">
          {t("famNotificationSettings.manageYourAppAppearanceAnd")}
        </p>
      </ManagementHeader>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            {t("famNotificationSettings.appearance")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

      <NotificationPreferences />
    </div>
  );
}

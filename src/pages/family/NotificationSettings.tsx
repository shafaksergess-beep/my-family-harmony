import { NotificationPreferences } from '@/components/settings/NotificationPreferences';
import { ThemeToggle } from '@/components/settings/ThemeToggle';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Palette } from 'lucide-react';

export default function NotificationSettings() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Settings & Preferences</h1>
        <p className="text-muted-foreground">
          Manage your app appearance and notification preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance
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

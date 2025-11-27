import { NotificationPreferences } from '@/components/settings/NotificationPreferences';

export default function NotificationSettings() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Notification Settings</h1>
        <p className="text-muted-foreground">
          Manage how and when you receive notifications
        </p>
      </div>

      <NotificationPreferences />
    </div>
  );
}

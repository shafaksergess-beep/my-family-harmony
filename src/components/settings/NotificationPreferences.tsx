import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bell, Mail, MessageSquare, Loader2, BellRing, AlertTriangle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMobilePush } from '@/hooks/useMobilePush';

interface NotificationSettings {
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  meeting_reminders: boolean;
  attendance_deadlines: boolean;
  payment_reminders: boolean;
  fines: boolean;
  loan_updates: boolean;
  assistance_notifications: boolean;
  announcements: boolean;
  digest_frequency: 'daily' | 'weekly' | 'monthly' | 'never';
}

const DEFAULTS: NotificationSettings = {
  email_enabled: true,
  sms_enabled: false,
  push_enabled: true,
  meeting_reminders: true,
  attendance_deadlines: true,
  payment_reminders: true,
  fines: true,
  loan_updates: true,
  assistance_notifications: true,
  announcements: true,
  digest_frequency: 'weekly',
};

export function NotificationPreferences() {
  const [userId, setUserId] = useState<string | null>(null);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [hasFcmToken, setHasFcmToken] = useState(false);
  const { enable: enableMobilePush, platform } = useMobilePush(userId);

  const loadSettings = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', uid)
      .is('family_id', null)
      .maybeSingle();
    if (error) console.warn('[notifications] load error', error);
    if (data) {
      setSettings({
        email_enabled: data.email_enabled,
        sms_enabled: data.sms_enabled,
        push_enabled: data.push_enabled,
        meeting_reminders: data.meeting_reminders,
        attendance_deadlines: (data as { attendance_deadlines?: boolean }).attendance_deadlines ?? true,
        payment_reminders: data.payment_reminders,
        fines: (data as { fines?: boolean }).fines ?? true,
        loan_updates: data.loan_updates,
        assistance_notifications: data.assistance_notifications,
        announcements: (data as { announcements?: boolean }).announcements ?? true,
        digest_frequency: data.digest_frequency as NotificationSettings['digest_frequency'],
      });
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', uid)
      .maybeSingle();
    setHasFcmToken(!!profile?.push_token);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }
        setUserId(user.id);
        await loadSettings(user.id);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load notification preferences');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [loadSettings]);

  const handleSave = async () => {
    if (!userId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert(
          { user_id: userId, family_id: null, ...settings },
          { onConflict: 'user_id,family_id' }
        );
      if (error) throw error;
      toast.success('Notification preferences saved');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnablePush = async () => {
    if (!userId) {
      toast.error('You must be signed in');
      return;
    }
    setIsEnablingPush(true);
    try {
      const token = await enableMobilePush();
      setPushPermission(
        typeof Notification !== 'undefined' ? Notification.permission : 'denied'
      );
      if (!token) {
        toast.error(
          typeof Notification !== 'undefined' && Notification.permission === 'denied'
            ? 'Notifications blocked. Enable them in your device settings.'
            : `Push notifications are not available (${platform}).`
        );
        return;
      }
      const { error } = await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', userId);
      if (error) throw error;
      setHasFcmToken(true);
      setSettings((p) => ({ ...p, push_enabled: true }));
      toast.success('Push notifications enabled');
    } catch (e) {
      console.error(e);
      toast.error('Failed to enable push notifications');
    } finally {
      setIsEnablingPush(false);
    }
  };

  const handleTestPush = async () => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') {
      toast.error('Enable push notifications first');
      return;
    }
    new Notification('Kinsroot', {
      body: 'Test notification — your device is set up correctly.',
      icon: '/app-icon.png',
    });
    toast.success('Test notification sent');
  };

  const handleToggle = (key: keyof NotificationSettings) =>
    setSettings((p) => ({ ...p, [key]: !p[key] }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pushReady = pushPermission === 'granted' && hasFcmToken;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Channels
          </CardTitle>
          <CardDescription>Choose how you want to receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Push */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="push" className="flex items-center gap-2">
                <BellRing className="h-4 w-4" />
                Push Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                {pushReady
                  ? 'This device is registered for push notifications.'
                  : pushPermission === 'denied'
                  ? 'Blocked. Enable notifications in your browser settings to receive pushes.'
                  : 'Get instant alerts on this device.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {pushReady ? (
                <Button variant="outline" size="sm" onClick={handleTestPush}>
                  Test
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleEnablePush}
                  disabled={isEnablingPush || pushPermission === 'denied'}
                >
                  {isEnablingPush && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                  Enable
                </Button>
              )}
              <Switch
                id="push"
                checked={settings.push_enabled}
                onCheckedChange={() => handleToggle('push_enabled')}
                disabled={!pushReady}
              />
            </div>
          </div>

          {pushPermission === 'denied' && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <span>
                Notifications are blocked at the browser level. Click the lock icon in your
                address bar → Site settings → Notifications → Allow.
              </span>
            </div>
          )}

          {/* Email */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Notifications
              </Label>
              <p className="text-sm text-muted-foreground">Receive notifications via email</p>
            </div>
            <Switch
              id="email"
              checked={settings.email_enabled}
              onCheckedChange={() => handleToggle('email_enabled')}
            />
          </div>

          {/* SMS */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sms" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                SMS Notifications
              </Label>
              <p className="text-sm text-muted-foreground">Receive notifications via SMS</p>
            </div>
            <Switch
              id="sms"
              checked={settings.sms_enabled}
              onCheckedChange={() => handleToggle('sms_enabled')}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>Choose which events you want to be notified about</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {([
            ['meeting_reminders', 'Meeting Reminders', 'Upcoming family meetings'],
            ['attendance_deadlines', 'Attendance Deadlines', 'Reminders to check in before meetings'],
            ['payment_reminders', 'Payment Reminders', 'Contributions, dues, and njangi'],
            ['fines', 'Fines', 'When a fine is recorded against you'],
            ['loan_updates', 'Loan Updates', 'Approvals, payments, and deadlines'],
            ['assistance_notifications', 'Assistance Events', 'Births, deaths, sickness, weddings'],
            ['announcements', 'Family Announcements', 'Messages from family leadership'],
          ] as const).map(([key, label, desc]) => (
            <div key={key} className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor={key}>{label}</Label>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch
                id={key}
                checked={settings[key]}
                onCheckedChange={() => handleToggle(key)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Digest</CardTitle>
          <CardDescription>Receive a summary of family activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="digest">Digest Frequency</Label>
            <Select
              value={settings.digest_frequency}
              onValueChange={(v: NotificationSettings['digest_frequency']) =>
                setSettings((p) => ({ ...p, digest_frequency: v }))
              }
            >
              <SelectTrigger id="digest">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isSaving} className="w-full">
        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Preferences
      </Button>
    </div>
  );
}

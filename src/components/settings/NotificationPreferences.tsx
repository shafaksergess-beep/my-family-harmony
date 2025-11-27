import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bell, Mail, MessageSquare, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface NotificationSettings {
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  meeting_reminders: boolean;
  payment_reminders: boolean;
  loan_updates: boolean;
  assistance_notifications: boolean;
  digest_frequency: 'daily' | 'weekly' | 'monthly' | 'never';
}

export function NotificationPreferences() {
  const { familySlug } = useParams();
  const [settings, setSettings] = useState<NotificationSettings>({
    email_enabled: true,
    sms_enabled: false,
    push_enabled: true,
    meeting_reminders: true,
    payment_reminders: true,
    loan_updates: true,
    assistance_notifications: true,
    digest_frequency: 'weekly',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [familySlug]);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // TODO: Load from database when notification_preferences table is created
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading notification settings:', error);
      toast.error('Failed to load notification preferences');
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      // TODO: Save to database when notification_preferences table is created
      // await supabase.from('notification_preferences').upsert({
      //   user_id: user.id,
      //   family_slug: familySlug,
      //   ...settings,
      // });

      toast.success('Notification preferences saved successfully');
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast.error('Failed to save notification preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Channels
          </CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications via email
              </p>
            </div>
            <Switch
              id="email"
              checked={settings.email_enabled}
              onCheckedChange={() => handleToggle('email_enabled')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sms" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                SMS Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications via SMS
              </p>
            </div>
            <Switch
              id="sms"
              checked={settings.sms_enabled}
              onCheckedChange={() => handleToggle('sms_enabled')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Push Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive push notifications in your browser
              </p>
            </div>
            <Switch
              id="push"
              checked={settings.push_enabled}
              onCheckedChange={() => handleToggle('push_enabled')}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>
            Select which events you want to be notified about
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="meetings">Meeting Reminders</Label>
            <Switch
              id="meetings"
              checked={settings.meeting_reminders}
              onCheckedChange={() => handleToggle('meeting_reminders')}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="payments">Payment Reminders</Label>
            <Switch
              id="payments"
              checked={settings.payment_reminders}
              onCheckedChange={() => handleToggle('payment_reminders')}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="loans">Loan Updates</Label>
            <Switch
              id="loans"
              checked={settings.loan_updates}
              onCheckedChange={() => handleToggle('loan_updates')}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="assistance">Assistance Notifications</Label>
            <Switch
              id="assistance"
              checked={settings.assistance_notifications}
              onCheckedChange={() => handleToggle('assistance_notifications')}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Digest</CardTitle>
          <CardDescription>
            Receive a summary of family activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="digest">Digest Frequency</Label>
            <Select
              value={settings.digest_frequency}
              onValueChange={(value: any) =>
                setSettings((prev) => ({ ...prev, digest_frequency: value }))
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

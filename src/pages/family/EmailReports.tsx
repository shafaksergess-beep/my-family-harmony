import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Mail, Calendar, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DigestSettings {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  include_contributions: boolean;
  include_loans: boolean;
  include_meetings: boolean;
  include_attendance: boolean;
}

export default function EmailReports() {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { family, canManageFinances } = useFamilyAuth(familySlug);
  const { toast } = useToast();

  const [settings, setSettings] = useState<DigestSettings>({
    enabled: false,
    frequency: 'weekly',
    recipients: [],
    include_contributions: true,
    include_loans: true,
    include_meetings: true,
    include_attendance: true,
  });
  const [newRecipient, setNewRecipient] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (family) {
      loadSettings();
    }
  }, [family]);

  const loadSettings = async () => {
    try {
      // In a real implementation, fetch from a settings table
      // For now, use dummy data
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!family) return;

    setIsSaving(true);
    try {
      // In a real implementation, save to database and configure cron job
      toast({
        title: "Settings saved",
        description: "Email report settings have been updated",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addRecipient = () => {
    if (newRecipient && newRecipient.includes('@')) {
      setSettings({
        ...settings,
        recipients: [...settings.recipients, newRecipient],
      });
      setNewRecipient("");
    }
  };

  const removeRecipient = (email: string) => {
    setSettings({
      ...settings,
      recipients: settings.recipients.filter(r => r !== email),
    });
  };

  if (!canManageFinances) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">You don't have permission to manage reports.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/family/${familySlug}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Automated Email Reports</h1>
          <p className="text-muted-foreground">Configure scheduled financial and activity reports</p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              <CardTitle>Report Configuration</CardTitle>
            </div>
            <CardDescription>Set up automated email digests for family updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enabled">Enable Automated Reports</Label>
                <p className="text-sm text-muted-foreground">
                  Send regular email updates to specified recipients
                </p>
              </div>
              <Switch
                id="enabled"
                checked={settings.enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Report Frequency</Label>
              <Select
                value={settings.frequency}
                onValueChange={(value: any) => setSettings({ ...settings, frequency: value })}
              >
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly (Monday mornings)</SelectItem>
                  <SelectItem value="monthly">Monthly (1st of month)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle>Recipients</CardTitle>
            </div>
            <CardDescription>Email addresses that will receive reports</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="email@example.com"
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
              />
              <Button onClick={addRecipient}>Add</Button>
            </div>

            <div className="space-y-2">
              {settings.recipients.map((email) => (
                <div key={email} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">{email}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRecipient(email)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              {settings.recipients.length === 0 && (
                <p className="text-sm text-muted-foreground">No recipients added yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <CardTitle>Report Contents</CardTitle>
            </div>
            <CardDescription>Select what information to include in reports</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="contributions">Contribution Summary</Label>
              <Switch
                id="contributions"
                checked={settings.include_contributions}
                onCheckedChange={(checked) => setSettings({ ...settings, include_contributions: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="loans">Loan Status</Label>
              <Switch
                id="loans"
                checked={settings.include_loans}
                onCheckedChange={(checked) => setSettings({ ...settings, include_loans: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="meetings">Upcoming Meetings</Label>
              <Switch
                id="meetings"
                checked={settings.include_meetings}
                onCheckedChange={(checked) => setSettings({ ...settings, include_meetings: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="attendance">Attendance Summary</Label>
              <Switch
                id="attendance"
                checked={settings.include_attendance}
                onCheckedChange={(checked) => setSettings({ ...settings, include_attendance: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}

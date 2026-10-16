import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
        title: t("famEmailReports.error"),
        description: t("famEmailReports.failedToLoadSettings"),
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
        title: t("famEmailReports.settingsSaved"),
        description: t("famEmailReports.emailReportSettingsHaveBeen"),
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: t("famEmailReports.error"),
        description: t("famEmailReports.failedToSaveSettings"),
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
            <p className="text-muted-foreground">{t("famEmailReports.youDonTHavePermission")}</p>
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
            <p className="text-muted-foreground">{t("famEmailReports.loading")}</p>
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
          <h1 className="text-3xl font-bold">{t("famEmailReports.automatedEmailReports")}</h1>
          <p className="text-muted-foreground">{t("famEmailReports.configureScheduledFinancialAndActivity")}</p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              <CardTitle>{t("famEmailReports.reportConfiguration")}</CardTitle>
            </div>
            <CardDescription>{t("famEmailReports.setUpAutomatedEmailDigests")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enabled">{t("famEmailReports.enableAutomatedReports")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("famEmailReports.sendRegularEmailUpdatesTo")}
                </p>
              </div>
              <Switch
                id="enabled"
                checked={settings.enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">{t("famEmailReports.reportFrequency")}</Label>
              <Select
                value={settings.frequency}
                onValueChange={(value: any) => setSettings({ ...settings, frequency: value })}
              >
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t("famEmailReports.daily")}</SelectItem>
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
              <CardTitle>{t("famEmailReports.recipients")}</CardTitle>
            </div>
            <CardDescription>{t("famEmailReports.emailAddressesThatWillReceive")}</CardDescription>
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
              <Button onClick={addRecipient}>{t("famEmailReports.add")}</Button>
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
                    {t("famEmailReports.remove")}
                  </Button>
                </div>
              ))}
              {settings.recipients.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("famEmailReports.noRecipientsAddedYet")}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <CardTitle>{t("famEmailReports.reportContents")}</CardTitle>
            </div>
            <CardDescription>{t("famEmailReports.selectWhatInformationToInclude")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="contributions">{t("famEmailReports.contributionSummary")}</Label>
              <Switch
                id="contributions"
                checked={settings.include_contributions}
                onCheckedChange={(checked) => setSettings({ ...settings, include_contributions: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="loans">{t("famEmailReports.loanStatus")}</Label>
              <Switch
                id="loans"
                checked={settings.include_loans}
                onCheckedChange={(checked) => setSettings({ ...settings, include_loans: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="meetings">{t("famEmailReports.upcomingMeetings")}</Label>
              <Switch
                id="meetings"
                checked={settings.include_meetings}
                onCheckedChange={(checked) => setSettings({ ...settings, include_meetings: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="attendance">{t("famEmailReports.attendanceSummary")}</Label>
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

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Mail, Send } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function DigestSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [settings, setSettings] = useState({
    weeklyEnabled: true,
    monthlyEnabled: true,
    weeklyDay: "monday",
    monthlyDay: "1",
  });

  useEffect(() => {
    checkSuperAdmin();
    loadSettings();
  }, []);

  const checkSuperAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: isSuperAdmin } = await supabase
      .rpc("is_super_admin", { check_user_id: session.user.id });

    if (!isSuperAdmin) {
      toast({
        title: t("admDigestSettings.accessDenied"),
        description: t("admDigestSettings.youMustBeASuper"),
        variant: "destructive",
      });
      navigate("/admin");
    }
  };

  const loadSettings = () => {
    const saved = localStorage.getItem("digest_settings");
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  };

  const saveSettings = () => {
    localStorage.setItem("digest_settings", JSON.stringify(settings));
    toast({
      title: t("admDigestSettings.success"),
      description: t("admDigestSettings.digestSettingsSavedSuccessfully"),
    });
  };

  const sendTestDigest = async (period: "weekly" | "monthly") => {
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-digest`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            period,
            testMode: true,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to send test digest");
      }

      const result = await response.json();
      
      toast({
        title: t("admDigestSettings.testDigestSent"),
        description: `Sent ${result.results?.length || 0} test emails`,
      });
    } catch (error: any) {
      console.error("Error sending test digest:", error);
      toast({
        title: t("admDigestSettings.error"),
        description: error.message || "Failed to send test digest",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t("admDigestSettings.emailDigestSettings")}</h1>
            <p className="text-muted-foreground">
              {t("admDigestSettings.configureAutomatedEmailSummariesFor")}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t("admDigestSettings.weeklyDigest")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="weekly-enabled">{t("admDigestSettings.enableWeeklyDigest")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("admDigestSettings.sendWeeklySummariesToFamily")}
                </p>
              </div>
              <Switch
                id="weekly-enabled"
                checked={settings.weeklyEnabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, weeklyEnabled: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>{t("admDigestSettings.sendOn")}</Label>
              <Select
                value={settings.weeklyDay}
                onValueChange={(value) =>
                  setSettings({ ...settings, weeklyDay: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monday">{t("admDigestSettings.monday")}</SelectItem>
                  <SelectItem value="tuesday">{t("admDigestSettings.tuesday")}</SelectItem>
                  <SelectItem value="wednesday">{t("admDigestSettings.wednesday")}</SelectItem>
                  <SelectItem value="thursday">{t("admDigestSettings.thursday")}</SelectItem>
                  <SelectItem value="friday">{t("admDigestSettings.friday")}</SelectItem>
                  <SelectItem value="saturday">{t("admDigestSettings.saturday")}</SelectItem>
                  <SelectItem value="sunday">{t("admDigestSettings.sunday")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => sendTestDigest("weekly")}
              disabled={sending}
              variant="outline"
              className="w-full"
            >
              <Send className="mr-2 h-4 w-4" />
              {t("admDigestSettings.sendTestWeeklyDigest")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t("admDigestSettings.monthlyDigest")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="monthly-enabled">{t("admDigestSettings.enableMonthlyDigest")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("admDigestSettings.sendMonthlySummariesToFamily")}
                </p>
              </div>
              <Switch
                id="monthly-enabled"
                checked={settings.monthlyEnabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, monthlyEnabled: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>{t("admDigestSettings.sendOnDay")}</Label>
              <Select
                value={settings.monthlyDay}
                onValueChange={(value) =>
                  setSettings({ ...settings, monthlyDay: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={String(day)}>
                      Day {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => sendTestDigest("monthly")}
              disabled={sending}
              variant="outline"
              className="w-full"
            >
              <Send className="mr-2 h-4 w-4" />
              {t("admDigestSettings.sendTestMonthlyDigest")}
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate("/admin")}>
            {t("admDigestSettings.cancel")}
          </Button>
          <Button onClick={saveSettings}>
            {t("admDigestSettings.saveSettings")}
          </Button>
        </div>

        <Card className="bg-muted">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">{t("admDigestSettings.setupInstructions")}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t("admDigestSettings.toEnableAutomatedDigestEmails")}
            </p>
            <div className="bg-background p-4 rounded font-mono text-xs overflow-x-auto">
              {`-- Weekly digest (every Monday at 9 AM)
select cron.schedule(
  'weekly-digest',
  '0 9 * * 1',
  $$
  select net.http_post(
    url:='${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-digest',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}"}'::jsonb,
    body:='{"period": "weekly"}'::jsonb
  ) as request_id;
  $$
);

-- Monthly digest (1st day of month at 9 AM)
select cron.schedule(
  'monthly-digest',
  '0 9 1 * *',
  $$
  select net.http_post(
    url:='${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-digest',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}"}'::jsonb,
    body:='{"period": "monthly"}'::jsonb
  ) as request_id;
  $$
);`}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

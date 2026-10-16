import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Mail, Calendar, Clock } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const EmailReports = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    enabled: false,
    frequency: 'weekly', // daily, weekly, monthly
    day_of_week: '1', // Monday
    day_of_month: '1',
    time: '09:00',
    recipients: '',
    include_activity: true,
    include_statistics: true,
  });

  useEffect(() => {
    checkAuthAndLoadConfig();
  }, []);

  const checkAuthAndLoadConfig = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: superAdminData } = await supabase
        .from("super_admins")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!superAdminData) {
        toast({
          title: t("admEmailReports.accessDenied"),
          description: t("admEmailReports.youDonTHavePermission"),
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      // Load existing config from localStorage for now
      const savedConfig = localStorage.getItem('email-report-config');
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }
    } catch (error) {
      console.error("Auth check error:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save to localStorage for now (in production, save to database)
      localStorage.setItem('email-report-config', JSON.stringify(config));
      
      toast({
        title: t("admEmailReports.success"),
        description: t("admEmailReports.emailReportScheduleSavedSuccessfully"),
      });
    } catch (error) {
      console.error("Error saving config:", error);
      toast({
        title: t("admEmailReports.error"),
        description: t("admEmailReports.failedToSaveEmailReport"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/admin/dashboard")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("common.back")}
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Mail className="w-6 h-6" />
                  {t("admEmailReports.scheduledEmailReports")}
                </h1>
                <p className="text-sm text-muted-foreground">{t("admEmailReports.configureAutomaticEmailReportsFor")}</p>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>{t("admEmailReports.emailReportConfiguration")}</CardTitle>
            <CardDescription>{t("admEmailReports.setUpAutomaticEmailReports")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enabled">{t("admEmailReports.enableEmailReports")}</Label>
                <p className="text-sm text-muted-foreground">{t("admEmailReports.automaticallySendScheduledReports")}</p>
              </div>
              <Switch
                id="enabled"
                checked={config.enabled}
                onCheckedChange={(enabled) => setConfig({ ...config, enabled })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">{t("admEmailReports.reportFrequency")}</Label>
              <Select
                value={config.frequency}
                onValueChange={(frequency) => setConfig({ ...config, frequency })}
                disabled={!config.enabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t("admEmailReports.daily")}</SelectItem>
                  <SelectItem value="weekly">{t("admEmailReports.weekly")}</SelectItem>
                  <SelectItem value="monthly">{t("admEmailReports.monthly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {config.frequency === 'weekly' && (
              <div className="space-y-2">
                <Label htmlFor="day">{t("admEmailReports.dayOfWeek")}</Label>
                <Select
                  value={config.day_of_week}
                  onValueChange={(day_of_week) => setConfig({ ...config, day_of_week })}
                  disabled={!config.enabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t("admEmailReports.monday")}</SelectItem>
                    <SelectItem value="2">{t("admEmailReports.tuesday")}</SelectItem>
                    <SelectItem value="3">{t("admEmailReports.wednesday")}</SelectItem>
                    <SelectItem value="4">{t("admEmailReports.thursday")}</SelectItem>
                    <SelectItem value="5">{t("admEmailReports.friday")}</SelectItem>
                    <SelectItem value="6">{t("admEmailReports.saturday")}</SelectItem>
                    <SelectItem value="0">{t("admEmailReports.sunday")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {config.frequency === 'monthly' && (
              <div className="space-y-2">
                <Label htmlFor="day">{t("admEmailReports.dayOfMonth")}</Label>
                <Input
                  id="day"
                  type="number"
                  min="1"
                  max="28"
                  value={config.day_of_month}
                  onChange={(e) => setConfig({ ...config, day_of_month: e.target.value })}
                  disabled={!config.enabled}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="time">{t("admEmailReports.time")}</Label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <Input
                  id="time"
                  type="time"
                  value={config.time}
                  onChange={(e) => setConfig({ ...config, time: e.target.value })}
                  disabled={!config.enabled}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipients">{t("admEmailReports.recipients")}</Label>
              <Input
                id="recipients"
                placeholder="admin@example.com, manager@example.com"
                value={config.recipients}
                onChange={(e) => setConfig({ ...config, recipients: e.target.value })}
                disabled={!config.enabled}
              />
              <p className="text-xs text-muted-foreground">{t("admEmailReports.commaSeparatedEmailAddresses")}</p>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-medium">{t("admEmailReports.reportContents")}</h3>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="include_activity">{t("admEmailReports.activityLogs")}</Label>
                  <p className="text-sm text-muted-foreground">{t("admEmailReports.includeRecentAdminActions")}</p>
                </div>
                <Switch
                  id="include_activity"
                  checked={config.include_activity}
                  onCheckedChange={(include_activity) => setConfig({ ...config, include_activity })}
                  disabled={!config.enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="include_statistics">{t("admEmailReports.statistics")}</Label>
                  <p className="text-sm text-muted-foreground">{t("admEmailReports.includeSystemStatisticsAndMetrics")}</p>
                </div>
                <Switch
                  id="include_statistics"
                  checked={config.include_statistics}
                  onCheckedChange={(include_statistics) => setConfig({ ...config, include_statistics })}
                  disabled={!config.enabled}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => navigate("/admin/dashboard")}>
                {t("admEmailReports.cancel")}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Configuration
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default EmailReports;

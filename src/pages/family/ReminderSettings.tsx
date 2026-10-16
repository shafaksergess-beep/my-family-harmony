import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Save, AlertTriangle, Mail, MessageSquare, Phone } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ReminderSettings = () => {
  const { t } = useTranslation();
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { family, isFamilyHead, isLoading } = useFamilyAuth(familySlug);
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    daysForEmail: 1,
    daysForSms: 3,
    daysForWhatsapp: 7,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isFamilyHead) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>{t("famReminderSettings.accessDenied")}</CardTitle>
            <CardDescription>{t("famReminderSettings.onlyFamilyHeadsCanConfigure")}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      toast({
        title: t("famReminderSettings.settingsSaved"),
        description: t("famReminderSettings.latePaymentReminderSettingsHave"),
      });

      setTimeout(() => {
        navigate(`/family/${familySlug}`);
      }, 1000);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: t("famReminderSettings.error"),
        description: t("famReminderSettings.failedToSaveReminderSettings"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(`/family/${familySlug}`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("famReminderSettings.back")}
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t("famReminderSettings.reminderSettings")}</h1>
              <p className="text-sm text-muted-foreground">{t("famReminderSettings.configureLatePaymentReminderEscalation")}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t("famReminderSettings.theSystemAutomaticallyChecksFor")}
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>{t("famReminderSettings.escalationSchedule")}</CardTitle>
            <CardDescription>
              {t("famReminderSettings.configureWhenEachTypeOf")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <Mail className="w-5 h-5 text-blue-500 mt-2" />
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="email">{t("famReminderSettings.emailReminder")}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="email"
                        type="number"
                        min="1"
                        value={settings.daysForEmail}
                        onChange={(e) => setSettings({ ...settings, daysForEmail: parseInt(e.target.value) })}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">{t("famReminderSettings.daysAfterDueDate")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("famReminderSettings.firstReminderSentViaEmail")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <MessageSquare className="w-5 h-5 text-green-500 mt-2" />
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="sms">{t("famReminderSettings.smsReminder")}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="sms"
                        type="number"
                        min="1"
                        value={settings.daysForSms}
                        onChange={(e) => setSettings({ ...settings, daysForSms: parseInt(e.target.value) })}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">{t("famReminderSettings.daysAfterDueDate")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("famReminderSettings.escalatedToSmsIfPayment")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Phone className="w-5 h-5 text-purple-500 mt-2" />
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="whatsapp">{t("famReminderSettings.whatsappReminder")}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="whatsapp"
                        type="number"
                        min="1"
                        value={settings.daysForWhatsapp}
                        onChange={(e) => setSettings({ ...settings, daysForWhatsapp: parseInt(e.target.value) })}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">{t("famReminderSettings.daysAfterDueDate")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("famReminderSettings.finalEscalationViaWhatsappFor")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button type="submit" disabled={saving} className="w-full">
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("famReminderSettings.saving")}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {t("famReminderSettings.saveSettings")}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t("famReminderSettings.howItWorks")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              • The system checks for late payments every day at 8 AM
            </p>
            <p>
              • Reminders are sent automatically based on the escalation schedule
            </p>
            <p>
              • Each member receives only one reminder per type per contribution
            </p>
            <p>
              • Ensure members have valid email addresses and phone numbers in their profiles
            </p>
            <p>
              • WhatsApp reminders require phone numbers in international format (+237...)
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ReminderSettings;

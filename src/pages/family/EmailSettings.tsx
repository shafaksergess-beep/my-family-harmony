import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Bell, DollarSign, CreditCard, Calendar, Heart } from "lucide-react";

interface EmailPreferences {
  contributions: boolean;
  loans: boolean;
  meetings: boolean;
  assistance: boolean;
  savings: boolean;
  shares: boolean;
  attendance: boolean;
}

const EmailSettings = () => {
  const { t } = useTranslation();
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [familyName, setFamilyName] = useState("");
  const [preferences, setPreferences] = useState<EmailPreferences>({
    contributions: true,
    loans: true,
    meetings: true,
    assistance: true,
    savings: false,
    shares: false,
    attendance: false,
  });

  useEffect(() => {
    loadSettings();
  }, [familySlug]);

  const loadSettings = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: family } = await supabase
        .from("families")
        .select("id, name")
        .eq("slug", familySlug)
        .single();

      if (!family) {
        toast({
          title: t("famEmailSettings.error"),
          description: t("famEmailSettings.familyNotFound"),
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setFamilyName(family.name);

      // Load preferences from localStorage (could be moved to database)
      const savedPrefs = localStorage.getItem(`email-prefs-${user.id}-${family.id}`);
      if (savedPrefs) {
        setPreferences(JSON.parse(savedPrefs));
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: family } = await supabase
        .from("families")
        .select("id")
        .eq("slug", familySlug)
        .single();

      if (!family) return;

      // Save to localStorage (could be moved to database)
      localStorage.setItem(
        `email-prefs-${user.id}-${family.id}`,
        JSON.stringify(preferences)
      );

      toast({
        title: t("famEmailSettings.success"),
        description: t("famEmailSettings.emailPreferencesSavedSuccessfully"),
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: t("famEmailSettings.error"),
        description: t("famEmailSettings.failedToSavePreferences"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const togglePreference = (key: keyof EmailPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const sendTestEmail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", user.id)
        .single();

      if (!profile?.email) {
        toast({
          title: t("famEmailSettings.error"),
          description: t("famEmailSettings.noEmailAddressFoundIn"),
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.functions.invoke("send-notification", {
        body: {
          to: profile.email,
          subject: "Test Email - Kinsroot",
          userName: profile.full_name,
          familyName,
          eventType: "Test",
          eventDetails: "This is a test email from the Kinsroot app.",
        },
      });

      if (error) throw error;

      toast({
        title: t("famEmailSettings.success"),
        description: t("famEmailSettings.testEmailSentSuccessfully"),
      });
    } catch (error: any) {
      console.error("Error sending test email:", error);
      toast({
        title: t("famEmailSettings.error"),
        description: error.message || "Failed to send test email",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const settingsItems = [
    {
      key: "contributions" as keyof EmailPreferences,
      label: t("famEmailSettings.contributions"),
      description: t("famEmailSettings.getNotifiedWhenContributionsAre"),
      icon: DollarSign,
    },
    {
      key: "loans" as keyof EmailPreferences,
      label: t("famEmailSettings.loans"),
      description: t("famEmailSettings.receiveUpdatesOnLoanRequests"),
      icon: CreditCard,
    },
    {
      key: "meetings" as keyof EmailPreferences,
      label: t("famEmailSettings.meetings"),
      description: t("famEmailSettings.getRemindersAboutUpcomingFamily"),
      icon: Calendar,
    },
    {
      key: "assistance" as keyof EmailPreferences,
      label: t("famEmailSettings.assistanceEvents"),
      description: t("famEmailSettings.beNotifiedOfBirthsDeaths"),
      icon: Heart,
    },
    {
      key: "savings" as keyof EmailPreferences,
      label: t("famEmailSettings.savingsUpdates"),
      description: t("famEmailSettings.receiveMonthlySavingsSummaries"),
      icon: Bell,
    },
    {
      key: "shares" as keyof EmailPreferences,
      label: t("famEmailSettings.sharesDividends"),
      description: t("famEmailSettings.getNotifiedAboutSharePurchases"),
      icon: Bell,
    },
    {
      key: "attendance" as keyof EmailPreferences,
      label: t("famEmailSettings.attendanceReminders"),
      description: t("famEmailSettings.receiveAttendanceAndFineNotifications"),
      icon: Bell,
    },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/family/${familySlug}`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{t("famEmailSettings.emailNotifications")}</h1>
              <p className="text-muted-foreground">{familyName}</p>
            </div>
          </div>
          <Button variant="outline" onClick={sendTestEmail}>
            <Mail className="h-4 w-4 mr-2" />
            {t("famEmailSettings.sendTestEmail")}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("famEmailSettings.configureEmailAlerts")}</CardTitle>
            <CardDescription>
              {t("famEmailSettings.chooseWhichEventsShouldTrigger")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {settingsItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.key} className="flex items-start justify-between space-x-4">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="p-2 rounded-lg bg-muted">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label htmlFor={item.key} className="text-base font-medium cursor-pointer">
                        {item.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <Switch
                    id={item.key}
                    checked={preferences[item.key]}
                    onCheckedChange={() => togglePreference(item.key)}
                  />
                </div>
              );
            })}

            <div className="pt-4 border-t flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/family/${familySlug}`)}
              >
                {t("famEmailSettings.cancel")}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Preferences"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmailSettings;

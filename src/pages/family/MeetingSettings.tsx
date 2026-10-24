import { ManagementHeader } from "@/components/layout/ManagementMobile";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { Loader2, ArrowLeft, Save, Settings } from "lucide-react";

const MeetingSettings = () => {
  const { t } = useTranslation();
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { family, isFamilyHead, isLoading: authLoading } = useFamilyAuth(familySlug);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    meeting_frequency: "monthly",
    meeting_day: "last_saturday",
    meeting_time: "13:00",
    lateness_tolerance_minutes: 30,
    fine_after_30min: 500,
    fine_after_60min: 1000,
  });

  useEffect(() => {
    if (family) {
      setFormData({
        meeting_frequency: family.meeting_frequency || "monthly",
        meeting_day: family.meeting_day || "last_saturday",
        meeting_time: family.meeting_time || "13:00",
        lateness_tolerance_minutes: family.lateness_tolerance_minutes || 30,
        fine_after_30min: family.fine_after_30min || 500,
        fine_after_60min: family.fine_after_60min || 1000,
      });
    }
  }, [family]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!family) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("families")
        .update({
          meeting_frequency: formData.meeting_frequency,
          meeting_day: formData.meeting_day,
          meeting_time: formData.meeting_time,
          lateness_tolerance_minutes: formData.lateness_tolerance_minutes,
          fine_after_30min: formData.fine_after_30min,
          fine_after_60min: formData.fine_after_60min,
        })
        .eq("id", family.id);

      if (error) throw error;

      toast({
        title: t("famMeetingSettings.success"),
        description: t("famMeetingSettings.meetingSettingsUpdatedSuccessfully"),
      });
    } catch (error: any) {
      console.error("Error updating settings:", error);
      toast({
        title: t("famMeetingSettings.error"),
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
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
            <CardTitle>{t("famMeetingSettings.accessDenied")}</CardTitle>
            <CardDescription>{t("famMeetingSettings.onlyFamilyHeadsCanAccess")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate(`/family/${familySlug}`)}>{t("famMeetingSettings.goBack")}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <ManagementHeader className="flex items-center gap-4" title={t("famMeetingSettings.meetingSettings")} as="div">
            <Button variant="ghost" onClick={() => navigate(`/family/${familySlug}`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("famMeetingSettings.back")}
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Settings className="w-6 h-6" />
                {t("famMeetingSettings.meetingSettings")}
              </h1>
              <p className="text-sm text-muted-foreground">{t("famMeetingSettings.configureMeetingSchedulesAndFines")}</p>
            </div>
          </ManagementHeader>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>{t("famMeetingSettings.meetingConfiguration")}</CardTitle>
              <CardDescription>
                {t("famMeetingSettings.setMeetingFrequencyTimeAnd")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="frequency">{t("famMeetingSettings.meetingFrequency")}</Label>
                <Select
                  value={formData.meeting_frequency}
                  onValueChange={(value) =>
                    setFormData({ ...formData, meeting_frequency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">{t("famMeetingSettings.weekly")}</SelectItem>
                    <SelectItem value="biweekly">{t("famMeetingSettings.biWeekly")}</SelectItem>
                    <SelectItem value="monthly">{t("famMeetingSettings.monthly")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="day">{t("famMeetingSettings.meetingDay")}</Label>
                <Select
                  value={formData.meeting_day}
                  onValueChange={(value) =>
                    setFormData({ ...formData, meeting_day: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last_saturday">{t("famMeetingSettings.lastSaturdayOfMonth")}</SelectItem>
                    <SelectItem value="first_saturday">{t("famMeetingSettings.firstSaturdayOfMonth")}</SelectItem>
                    <SelectItem value="saturday">{t("famMeetingSettings.everySaturday")}</SelectItem>
                    <SelectItem value="sunday">{t("famMeetingSettings.everySunday")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">{t("famMeetingSettings.meetingTime")}</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.meeting_time}
                  onChange={(e) =>
                    setFormData({ ...formData, meeting_time: e.target.value })
                  }
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Standard meeting duration: 3 hours (e.g., 13:00 - 16:00)
                </p>
              </div>

              <div className="border-t pt-4 space-y-4">
                <h3 className="font-semibold">{t("famMeetingSettings.latenessFinePolicy")}</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="tolerance">Tolerance Period (minutes)</Label>
                  <Input
                    id="tolerance"
                    type="number"
                    min="0"
                    value={formData.lateness_tolerance_minutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        lateness_tolerance_minutes: parseInt(e.target.value),
                      })
                    }
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    {t("famMeetingSettings.noFineAppliedWithinThis")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fine30">Fine After 30 Minutes (FCFA)</Label>
                  <Input
                    id="fine30"
                    type="number"
                    min="0"
                    value={formData.fine_after_30min}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fine_after_30min: parseFloat(e.target.value),
                      })
                    }
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    {t("famMeetingSettings.appliedFor3060Minutes")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fine60">Fine After 60 Minutes (FCFA)</Label>
                  <Input
                    id="fine60"
                    type="number"
                    min="0"
                    value={formData.fine_after_60min}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fine_after_60min: parseFloat(e.target.value),
                      })
                    }
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    {t("famMeetingSettings.appliedForOver60Minutes")}
                  </p>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("famMeetingSettings.saving")}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {t("famMeetingSettings.saveSettings")}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </form>
      </main>
    </div>
  );
};

export default MeetingSettings;

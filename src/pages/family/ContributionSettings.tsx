import { ManagementHeader } from "@/components/layout/ManagementMobile";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";

const ContributionSettings = () => {
  const { t } = useTranslation();
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { family, isFamilyHead, isLoading: authLoading } = useFamilyAuth(familySlug);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contributionScope, setContributionScope] = useState<"member" | "house">("member");
  const [mandatoryAmount, setMandatoryAmount] = useState("");

  useEffect(() => {
    if (family) {
      loadSettings();
    }
  }, [family]);

  const loadSettings = async () => {
    if (!family) return;

    try {
      const { data, error } = await supabase
        .from("families")
        .select("contribution_scope, mandatory_contribution")
        .eq("id", family.id)
        .single();

      if (error) throw error;

      if (data) {
        setContributionScope((data.contribution_scope as "member" | "house") || "member");
        setMandatoryAmount(data.mandatory_contribution?.toString() || "");
      }
    } catch (error: any) {
      console.error("Error loading settings:", error);
      toast({
        title: t("famContributionSettings.error"),
        description: t("famContributionSettings.failedToLoadContributionSettings"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!family) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("families")
        .update({
          contribution_scope: contributionScope,
          mandatory_contribution: parseFloat(mandatoryAmount) || 25000,
        })
        .eq("id", family.id);

      if (error) throw error;

      toast({
        title: t("famContributionSettings.success"),
        description: t("famContributionSettings.contributionSettingsSavedSuccessfully"),
      });
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast({
        title: t("famContributionSettings.error"),
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
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
            <CardTitle>{t("famContributionSettings.accessDenied")}</CardTitle>
            <CardDescription>{t("famContributionSettings.onlyFamilyHeadsCanAccess")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate(`/family/${familySlug}`)}>
              {t("famContributionSettings.goBack")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <ManagementHeader className="flex items-center gap-4" title={t("famContributionSettings.contributionSettings")} as="div">
            <Button variant="ghost" onClick={() => navigate(`/family/${familySlug}/contributions`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("famContributionSettings.back")}
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t("famContributionSettings.contributionSettings")}</h1>
              <p className="text-sm text-muted-foreground">{t("famContributionSettings.configureHowContributionsAreTracked")}</p>
            </div>
          </ManagementHeader>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>{t("famContributionSettings.contributionType")}</CardTitle>
            <CardDescription>
              {t("famContributionSettings.chooseWhetherContributionsAreTracked")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label>{t("famContributionSettings.contributionScope")}</Label>
              <RadioGroup value={contributionScope} onValueChange={(value) => setContributionScope(value as "member" | "house")}>
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <RadioGroupItem value="member" id="member" />
                  <div className="flex-1">
                    <Label htmlFor="member" className="font-medium cursor-pointer">
                      {t("famContributionSettings.perMember")}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t("famContributionSettings.eachFamilyMemberPaysIndividual")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <RadioGroupItem value="house" id="house" />
                  <div className="flex-1">
                    <Label htmlFor="house" className="font-medium cursor-pointer">
                      {t("famContributionSettings.perHouse")}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t("famContributionSettings.eachHousePaysACollective")}
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">
                {contributionScope === "house" ? "House Contribution Amount" : "Member Contribution Amount"} (FCFA)
              </Label>
              <Input
                id="amount"
                type="number"
                value={mandatoryAmount}
                onChange={(e) => setMandatoryAmount(e.target.value)}
                placeholder="25000"
                min="0"
                step="1000"
              />
              <p className="text-sm text-muted-foreground">
                {contributionScope === "house" 
                  ? "The amount each house must contribute per meeting"
                  : "The amount each member must contribute per meeting"
                }
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => navigate(`/family/${familySlug}/contributions`)}>
                {t("famContributionSettings.cancel")}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("famContributionSettings.saving")}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {t("famContributionSettings.saveSettings")}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t("famContributionSettings.understandingContributionScopes")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">{t("famContributionSettings.perMember")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("famContributionSettings.inThisModeEachIndividual")}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">{t("famContributionSettings.perHouse")}</h3>
              <p className="text-sm text-muted-foreground">
                In this mode, each house pays a fixed amount regardless of how many members belong to that house.
                If there are 3 houses and the contribution is 25,000 FCFA, each house owes 25,000 FCFA (75,000 FCFA total).
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ContributionSettings;

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { ArrowLeft, DollarSign, Save } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function FinancialSettings() {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { family, isFamilyHead, isLoading: authLoading } = useFamilyAuth(familySlug);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    min_savings_amount: "5000",
    min_loan_amount: "50000",
    loan_interest_rate: "2.5",
    njangi_amount: "25000",
    share_value: "50000",
    birth_assistance_amount: "5000",
    member_death_amount: "1000000",
    spouse_death_amount: "500000",
    child_death_amount: "500000",
    external_wonya_amount: "150000",
    external_other_amount: "100000",
    sickness_assistance_amount: "50000",
    wedding_assistance_amount: "100000",
    ceremony_invitation_amount: "2500",
  });

  useEffect(() => {
    if (family) {
      setSettings({
        min_savings_amount: family.min_savings_amount?.toString() || "5000",
        min_loan_amount: family.min_loan_amount?.toString() || "50000",
        loan_interest_rate: family.loan_interest_rate?.toString() || "2.5",
        njangi_amount: family.njangi_amount?.toString() || "25000",
        share_value: family.share_value?.toString() || "50000",
        birth_assistance_amount: (family as any).birth_assistance_amount?.toString() || "5000",
        member_death_amount: (family as any).member_death_amount?.toString() || "1000000",
        spouse_death_amount: (family as any).spouse_death_amount?.toString() || "500000",
        child_death_amount: (family as any).child_death_amount?.toString() || "500000",
        external_wonya_amount: (family as any).external_wonya_amount?.toString() || "150000",
        external_other_amount: (family as any).external_other_amount?.toString() || "100000",
        sickness_assistance_amount: (family as any).sickness_assistance_amount?.toString() || "50000",
        wedding_assistance_amount: (family as any).wedding_assistance_amount?.toString() || "100000",
        ceremony_invitation_amount: (family as any).ceremony_invitation_amount?.toString() || "2500",
      });
    }
  }, [family]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!family) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from("families")
        .update({
          min_savings_amount: parseFloat(settings.min_savings_amount),
          min_loan_amount: parseFloat(settings.min_loan_amount),
          loan_interest_rate: parseFloat(settings.loan_interest_rate),
          njangi_amount: parseFloat(settings.njangi_amount),
          share_value: parseFloat(settings.share_value),
          birth_assistance_amount: parseFloat(settings.birth_assistance_amount),
          member_death_amount: parseFloat(settings.member_death_amount),
          spouse_death_amount: parseFloat(settings.spouse_death_amount),
          child_death_amount: parseFloat(settings.child_death_amount),
          external_wonya_amount: parseFloat(settings.external_wonya_amount),
          external_other_amount: parseFloat(settings.external_other_amount),
          sickness_assistance_amount: parseFloat(settings.sickness_assistance_amount),
          wedding_assistance_amount: parseFloat(settings.wedding_assistance_amount),
          ceremony_invitation_amount: parseFloat(settings.ceremony_invitation_amount),
        } as any)
        .eq("id", family.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Financial settings updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isFamilyHead) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
            <p className="text-muted-foreground mb-6">
              Only the family head can configure financial settings.
            </p>
            <Button onClick={() => navigate(`/family/${familySlug}`)}>
              Back to Dashboard
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/family/${familySlug}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Financial Settings</h1>
              <p className="text-muted-foreground">Configure financial empowerment parameters</p>
            </div>
          </div>
          <LanguageSwitcher />
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <Card className="p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b">
              <DollarSign className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-xl font-semibold">Savings Configuration</h2>
                <p className="text-sm text-muted-foreground">
                  Savings are optional but encouraged
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_savings_amount">
                Minimum Savings Amount (FCFA)
              </Label>
              <Input
                id="min_savings_amount"
                type="number"
                min="0"
                step="1000"
                value={settings.min_savings_amount}
                onChange={(e) =>
                  setSettings({ ...settings, min_savings_amount: e.target.value })
                }
                required
              />
              <p className="text-sm text-muted-foreground">
                Recommended monthly savings per member (not mandatory)
              </p>
            </div>
          </Card>

          <Card className="p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b">
              <DollarSign className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-xl font-semibold">Njangi Configuration</h2>
                <p className="text-sm text-muted-foreground">
                  Rotating savings scheme settings
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="njangi_amount">Njangi Amount per Person (FCFA)</Label>
              <Input
                id="njangi_amount"
                type="number"
                min="0"
                step="1000"
                value={settings.njangi_amount}
                onChange={(e) =>
                  setSettings({ ...settings, njangi_amount: e.target.value })
                }
                required
              />
              <p className="text-sm text-muted-foreground">
                Amount agreed upon by family in general meeting
              </p>
            </div>
          </Card>

          <Card className="p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b">
              <DollarSign className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-xl font-semibold">Loan Configuration</h2>
                <p className="text-sm text-muted-foreground">
                  All loans must be cleared by November
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="min_loan_amount">Minimum Loan Amount (FCFA)</Label>
                <Input
                  id="min_loan_amount"
                  type="number"
                  min="0"
                  step="1000"
                  value={settings.min_loan_amount}
                  onChange={(e) =>
                    setSettings({ ...settings, min_loan_amount: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="loan_interest_rate">Monthly Interest Rate (%)</Label>
                <Input
                  id="loan_interest_rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={settings.loan_interest_rate}
                  onChange={(e) =>
                    setSettings({ ...settings, loan_interest_rate: e.target.value })
                  }
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Interest rate applied per month on all loans
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b">
              <DollarSign className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-xl font-semibold">Shares Configuration</h2>
                <p className="text-sm text-muted-foreground">
                  Issued once yearly (January-March)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="share_value">Nominal Share Value (FCFA)</Label>
              <Input
                id="share_value"
                type="number"
                min="0"
                step="1000"
                value={settings.share_value}
                onChange={(e) =>
                  setSettings({ ...settings, share_value: e.target.value })
                }
                required
              />
              <p className="text-sm text-muted-foreground">
                Members can own multiple shares; shares form loan fund capital
              </p>
            </div>
          </Card>

          <Card className="p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b">
              <DollarSign className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-xl font-semibold">Assistance Budget Configuration</h2>
                <p className="text-sm text-muted-foreground">
                  Set default assistance amounts per event type
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="birth_assistance_amount">Birth Assistance (FCFA)</Label>
                <Input
                  id="birth_assistance_amount"
                  type="number"
                  min="0"
                  step="1000"
                  value={settings.birth_assistance_amount}
                  onChange={(e) => setSettings({ ...settings, birth_assistance_amount: e.target.value })}
                  required
                />
                <p className="text-sm text-muted-foreground">Per member contribution</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sickness_assistance_amount">Sickness (5+ days)</Label>
                <Input
                  id="sickness_assistance_amount"
                  type="number"
                  min="0"
                  step="1000"
                  value={settings.sickness_assistance_amount}
                  onChange={(e) => setSettings({ ...settings, sickness_assistance_amount: e.target.value })}
                  required
                />
                <p className="text-sm text-muted-foreground">Once per year</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="member_death_amount">Member Death (FCFA)</Label>
                <Input
                  id="member_death_amount"
                  type="number"
                  min="0"
                  step="1000"
                  value={settings.member_death_amount}
                  onChange={(e) => setSettings({ ...settings, member_death_amount: e.target.value })}
                  required
                />
                <p className="text-sm text-muted-foreground">50k wreath + beneficiary</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="spouse_death_amount">Spouse Death (FCFA)</Label>
                <Input
                  id="spouse_death_amount"
                  type="number"
                  min="0"
                  step="1000"
                  value={settings.spouse_death_amount}
                  onChange={(e) => setSettings({ ...settings, spouse_death_amount: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="child_death_amount">Child Death (FCFA)</Label>
                <Input
                  id="child_death_amount"
                  type="number"
                  min="0"
                  step="1000"
                  value={settings.child_death_amount}
                  onChange={(e) => setSettings({ ...settings, child_death_amount: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wedding_assistance_amount">Wedding (FCFA)</Label>
                <Input
                  id="wedding_assistance_amount"
                  type="number"
                  min="0"
                  step="1000"
                  value={settings.wedding_assistance_amount}
                  onChange={(e) => setSettings({ ...settings, wedding_assistance_amount: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="external_wonya_amount">External Wonya Kotto (FCFA)</Label>
                <Input
                  id="external_wonya_amount"
                  type="number"
                  min="0"
                  step="1000"
                  value={settings.external_wonya_amount}
                  onChange={(e) => setSettings({ ...settings, external_wonya_amount: e.target.value })}
                  required
                />
                <p className="text-sm text-muted-foreground">Up to max amount</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="external_other_amount">External Other (FCFA)</Label>
                <Input
                  id="external_other_amount"
                  type="number"
                  min="0"
                  step="1000"
                  value={settings.external_other_amount}
                  onChange={(e) => setSettings({ ...settings, external_other_amount: e.target.value })}
                  required
                />
                <p className="text-sm text-muted-foreground">Up to max amount</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ceremony_invitation_amount">Other Ceremony (FCFA)</Label>
                <Input
                  id="ceremony_invitation_amount"
                  type="number"
                  min="0"
                  step="1000"
                  value={settings.ceremony_invitation_amount}
                  onChange={(e) => setSettings({ ...settings, ceremony_invitation_amount: e.target.value })}
                  required
                />
                <p className="text-sm text-muted-foreground">Per member contribution</p>
              </div>
            </div>
          </Card>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/family/${familySlug}`)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

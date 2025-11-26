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
  });

  useEffect(() => {
    if (family) {
      setSettings({
        min_savings_amount: family.min_savings_amount?.toString() || "5000",
        min_loan_amount: family.min_loan_amount?.toString() || "50000",
        loan_interest_rate: family.loan_interest_rate?.toString() || "2.5",
        njangi_amount: family.njangi_amount?.toString() || "25000",
        share_value: family.share_value?.toString() || "50000",
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
        })
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

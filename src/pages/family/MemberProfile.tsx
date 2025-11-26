import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { Loader2, ArrowLeft, User, DollarSign, CreditCard, PiggyBank, Award } from "lucide-react";

interface MemberData {
  profile: {
    full_name: string;
    email: string | null;
  };
  role: string;
  house_name: string | null;
  contributions_summary: {
    total: number;
    paid: number;
    pending: number;
  };
  loans_summary: {
    total: number;
    outstanding: number;
    count: number;
  };
  savings_summary: {
    total: number;
    months: number;
  };
  shares_summary: {
    count: number;
    value: number;
  };
}

const MemberProfile = () => {
  const { familySlug, memberId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { family, isLoading: authLoading } = useFamilyAuth(familySlug);
  const [loading, setLoading] = useState(true);
  const [memberData, setMemberData] = useState<MemberData | null>(null);

  useEffect(() => {
    if (family && memberId) {
      loadMemberData();
    }
  }, [family, memberId]);

  const loadMemberData = async () => {
    try {
      // Get member details
      const { data: memberInfo, error: memberError } = await supabase
        .from("family_members")
        .select(`
          role,
          house_name,
          user_id,
          profiles!inner(full_name, email)
        `)
        .eq("id", memberId)
        .eq("family_id", family.id)
        .single();

      if (memberError) throw memberError;

      // Get contributions summary
      const { data: contributions } = await supabase
        .from("contributions")
        .select("amount, status")
        .eq("member_id", memberId);

      const contributionsSummary = {
        total: contributions?.reduce((sum, c) => sum + c.amount, 0) || 0,
        paid: contributions?.filter((c) => c.status === "paid").reduce((sum, c) => sum + c.amount, 0) || 0,
        pending: contributions?.filter((c) => c.status === "pending").reduce((sum, c) => sum + c.amount, 0) || 0,
      };

      // Get loans summary
      const { data: loans } = await supabase
        .from("loans")
        .select("amount, amount_paid")
        .eq("member_id", memberId);

      const loansSummary = {
        total: loans?.reduce((sum, l) => sum + l.amount, 0) || 0,
        outstanding: loans?.reduce((sum, l) => sum + (l.amount - (l.amount_paid || 0)), 0) || 0,
        count: loans?.length || 0,
      };

      // Get savings summary
      const { data: savings } = await supabase
        .from("savings")
        .select("amount")
        .eq("member_id", memberId);

      const savingsSummary = {
        total: savings?.reduce((sum, s) => sum + s.amount, 0) || 0,
        months: savings?.length || 0,
      };

      // Get shares summary
      const { data: shares } = await supabase
        .from("shares")
        .select("share_value")
        .eq("member_id", memberId)
        .eq("is_active", true);

      const sharesSummary = {
        count: shares?.length || 0,
        value: shares?.reduce((sum, s) => sum + s.share_value, 0) || 0,
      };

      setMemberData({
        profile: memberInfo.profiles as any,
        role: memberInfo.role,
        house_name: memberInfo.house_name,
        contributions_summary: contributionsSummary,
        loans_summary: loansSummary,
        savings_summary: savingsSummary,
        shares_summary: sharesSummary,
      });
    } catch (error: any) {
      console.error("Error loading member data:", error);
      toast({
        title: "Error",
        description: "Failed to load member profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!memberData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8">
          <p className="text-muted-foreground">Member not found</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(`/family/${familySlug}`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{memberData.profile.full_name}</h1>
              <p className="text-sm text-muted-foreground">Member Profile</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Member Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Member Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium">{memberData.profile.full_name}</span>
            </div>
            {memberData.profile.email && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{memberData.profile.email}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Role:</span>
              <Badge variant="secondary">{memberData.role.replace("_", " ").toUpperCase()}</Badge>
            </div>
            {memberData.house_name && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">House:</span>
                <span className="font-medium">{memberData.house_name}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contributions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Contributions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Contributed:</span>
                <span className="font-bold text-lg">{memberData.contributions_summary.total.toLocaleString()} FCFA</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Paid:</span>
                <span className="text-green-600 font-medium">{memberData.contributions_summary.paid.toLocaleString()} FCFA</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pending:</span>
                <span className="text-orange-600 font-medium">{memberData.contributions_summary.pending.toLocaleString()} FCFA</span>
              </div>
            </CardContent>
          </Card>

          {/* Loans */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Loans
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Loans:</span>
                <span className="font-medium">{memberData.loans_summary.count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Amount:</span>
                <span className="font-bold text-lg">{memberData.loans_summary.total.toLocaleString()} FCFA</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Outstanding:</span>
                <span className="text-red-600 font-medium">{memberData.loans_summary.outstanding.toLocaleString()} FCFA</span>
              </div>
            </CardContent>
          </Card>

          {/* Savings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PiggyBank className="w-5 h-5 text-primary" />
                Individual Savings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Savings:</span>
                <span className="font-bold text-lg">{memberData.savings_summary.total.toLocaleString()} FCFA</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Months Contributed:</span>
                <span className="font-medium">{memberData.savings_summary.months}</span>
              </div>
            </CardContent>
          </Card>

          {/* Shares */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Shares & Dividends
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Shares Owned:</span>
                <span className="font-medium">{memberData.shares_summary.count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Value:</span>
                <span className="font-bold text-lg">{memberData.shares_summary.value.toLocaleString()} FCFA</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default MemberProfile;

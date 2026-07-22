import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Users, LogOut, Sparkles } from "lucide-react";
import { JoinFamilyOptions } from "@/components/invitations/JoinFamilyOptions";
import SEO from "@/components/SEO";

const JoinFamilyOnboarding = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string>("");
  const [showJoin, setShowJoin] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth", { replace: true });
        return;
      }
      // If user is already in a family, skip onboarding.
      const { count } = await supabase
        .from("family_members")
        .select("id", { count: "exact", head: true })
        .eq("user_id", session.user.id);
      if ((count ?? 0) > 0) {
        navigate("/dashboard", { replace: true });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session.user.id)
        .maybeSingle();
      setDisplayName(profile?.full_name || session.user.email || "");
      setLoading(false);
    })();
  }, [navigate]);

  const signOut = async () => {
    await supabase.auth.signOut({ scope: "local" });
    navigate("/auth", { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <SEO
        title="Join your family | Kinsroot"
        description="Connect your Kinsroot account to a family to start tracking contributions, meetings, and more."
        canonical="/onboarding/join-family"
      />
      <div className="w-full max-w-2xl space-y-4">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
              <Sparkles className="h-7 w-7" />
            </div>
            <CardTitle>Welcome{displayName ? `, ${displayName.split(" ")[0]}` : ""}!</CardTitle>
            <CardDescription>
              Your account is ready. To finish setup, join or request to join a family.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" size="lg" onClick={() => setShowJoin(true)}>
              <Users className="h-4 w-4 mr-2" /> Join a family
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/dashboard")}
            >
              Skip for now — go to dashboard
            </Button>
            <Button variant="ghost" className="w-full" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground">
          Have an invitation link or reference code? Use "Join a family" above.
        </p>
      </div>
      <JoinFamilyOptions open={showJoin} onOpenChange={setShowJoin} />
    </div>
  );
};

export default JoinFamilyOnboarding;

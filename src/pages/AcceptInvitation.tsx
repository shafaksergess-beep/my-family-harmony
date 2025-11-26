import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadInvitation();
  }, []);

  const loadInvitation = async () => {
    const token = searchParams.get("token");
    if (!token) {
      toast({
        title: "Invalid Link",
        description: "This invitation link is invalid",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    try {
      // Check authentication first
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Redirect to auth with return URL
        navigate(`/auth?redirect=/accept-invitation?token=${token}`);
        return;
      }

      // Now load invitation (user is authenticated)
      const { data, error } = await supabase
        .from("invitations")
        .select("*, families:family_id(name)")
        .eq("token", token)
        .single();

      if (error || !data) {
        throw new Error("Invitation not found or you don't have access to it");
      }

      if (data.status !== "pending") {
        throw new Error("This invitation has already been used");
      }

      if (new Date(data.expires_at) < new Date()) {
        throw new Error("This invitation has expired");
      }

      setInvitation(data);
    } catch (error: any) {
      console.error("Error loading invitation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load invitation",
        variant: "destructive",
      });
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!invitation) return;

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Redirect to auth with return URL
        navigate(`/auth?redirect=/accept-invitation?token=${searchParams.get("token")}`);
        return;
      }

      // Check if user profile exists
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profile) {
        throw new Error("User profile not found");
      }

      // Update invitation status
      const { error: updateError } = await supabase
        .from("invitations")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .eq("id", invitation.id);

      if (updateError) throw updateError;

      // Add user to family
      const { error: memberError } = await supabase.from("family_members").insert({
        family_id: invitation.family_id,
        user_id: user.id,
        role: invitation.role,
      });

      if (memberError) throw memberError;

      toast({
        title: "Success!",
        description: `You've joined ${invitation.families?.name}`,
      });

      // Redirect to family page
      const { data: familyData } = await supabase
        .from("families")
        .select("slug")
        .eq("id", invitation.family_id)
        .single();

      if (familyData) {
        navigate(`/family/${familyData.slug}`);
      } else {
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept invitation",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!invitation) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("invitations")
        .update({ status: "declined" })
        .eq("id", invitation.id);

      if (error) throw error;

      toast({
        title: "Invitation Declined",
        description: "You have declined this invitation",
      });

      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error declining invitation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to decline invitation",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Family Invitation</CardTitle>
          <CardDescription>You've been invited to join a family</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Family Name:</p>
            <p className="text-lg font-semibold">{invitation.families?.name}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Your Role:</p>
            <p className="text-lg font-semibold">
              {invitation.role.replace("_", " ").toUpperCase()}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Expires:</p>
            <p className="text-sm">{new Date(invitation.expires_at).toLocaleDateString()}</p>
          </div>
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleAccept}
              disabled={processing}
              className="flex-1"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Accept
                </>
              )}
            </Button>
            <Button
              onClick={handleDecline}
              disabled={processing}
              variant="outline"
              className="flex-1"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Decline
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvitation;

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, CheckCircle, XCircle, Users, Calendar, Wallet, 
  Shield, Heart, ArrowRight, Sparkles, PartyPopper, UserCheck 
} from "lucide-react";
import { FamilyJoinOnboarding } from "@/components/onboarding/FamilyJoinOnboarding";
import SEO from "@/components/SEO";

interface InvitationData {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  families: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    logo_url?: string;
    heritage_info?: string;
  };
  inviter?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface FamilyMember {
  id: string;
  profiles: {
    full_name: string;
    avatar_url?: string;
  };
  role: string;
}

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<"preview" | "joining" | "welcome">("preview");
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [user, setUser] = useState<any>(null);
  const [showJoinOnboarding, setShowJoinOnboarding] = useState(false);

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
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      
      if (!currentUser) {
        // Store invitation token and redirect to auth
        localStorage.setItem("pendingInvitationToken", token);
        navigate(`/auth?redirect=/accept-invitation?token=${token}`);
        return;
      }

      // Load invitation with family and inviter details
      const { data, error } = await supabase
        .from("invitations")
        .select(`
          *,
          families:family_id (
            id, name, slug, description, logo_url, heritage_info
          )
        `)
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

      // Get inviter profile
      const { data: inviterProfile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", data.invited_by)
        .single();

      setInvitation({
        ...data,
        inviter: inviterProfile || undefined,
      } as InvitationData);
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
    if (!invitation || !user) return;

    setProcessing(true);
    setStep("joining");

    try {
      // Check if already a member
      const { data: existingMember } = await supabase
        .from("family_members")
        .select("id")
        .eq("family_id", invitation.families.id)
        .eq("user_id", user.id)
        .single();

      if (existingMember) {
        toast({
          title: "Already a member",
          description: "You're already a member of this family!",
        });
        navigate(`/family/${invitation.families.slug}`);
        return;
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
      const { error: memberError } = await supabase.from("family_members").insert([{
        family_id: invitation.families.id,
        user_id: user.id,
        role: invitation.role as any,
      }]);

      if (memberError) throw memberError;

      // Load family members for welcome screen
      const { data: members } = await supabase
        .from("family_members")
        .select(`
          id,
          role,
          profiles:user_id (full_name, avatar_url)
        `)
        .eq("family_id", invitation.families.id)
        .limit(8);

      setFamilyMembers(members as FamilyMember[] || []);
      setStep("welcome");
      setShowJoinOnboarding(true);

      toast({
        title: "Welcome to the family! 🎉",
        description: `You've successfully joined ${invitation.families.name}`,
      });
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept invitation",
        variant: "destructive",
      });
      setStep("preview");
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

  const getRoleBenefits = (role: string) => {
    const baseBenefits = [
      { icon: Calendar, text: "Attend family meetings" },
      { icon: Users, text: "Connect with family members" },
      { icon: Heart, text: "Participate in family events" },
    ];

    const roleBenefits: Record<string, typeof baseBenefits> = {
      family_head: [
        { icon: Shield, text: "Full administrative access" },
        { icon: Wallet, text: "Manage family finances" },
        ...baseBenefits,
      ],
      treasurer: [
        { icon: Wallet, text: "Manage contributions & payments" },
        ...baseBenefits,
      ],
      secretary: [
        { icon: Calendar, text: "Schedule & manage meetings" },
        ...baseBenefits,
      ],
      loan_committee: [
        { icon: Wallet, text: "Review loan applications" },
        ...baseBenefits,
      ],
      member: baseBenefits,
    };

    return roleBenefits[role] || baseBenefits;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  // Joining animation screen
  if (step === "joining") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="relative w-full h-full rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-8 h-8 text-primary animate-pulse" />
            </div>
          </div>
          <h2 className="text-xl font-bold mb-2">Joining {invitation.families.name}...</h2>
          <p className="text-muted-foreground">Setting up your membership</p>
        </div>
      </div>
    );
  }

  // Welcome screen after joining
  if (step === "welcome") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-primary/80 p-8 text-center text-primary-foreground">
              <PartyPopper className="w-12 h-12 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Welcome to the Family! 🎉</h1>
              <p className="opacity-90">You're now a member of {invitation.families.name}</p>
            </div>
            
            <CardContent className="p-6 space-y-6">
              {/* Family Members Preview */}
              {familyMembers.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Your family members</h3>
                  <div className="flex flex-wrap gap-2">
                    {familyMembers.map((member) => (
                      <div key={member.id} className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1.5">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={member.profiles?.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {member.profiles?.full_name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{member.profiles?.full_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Steps */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Next steps</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserCheck className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Complete your profile</p>
                      <p className="text-xs text-muted-foreground">Add your photo and contact info</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Check upcoming meetings</p>
                      <p className="text-xs text-muted-foreground">Stay updated on family events</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Set up contributions</p>
                      <p className="text-xs text-muted-foreground">Manage your payment preferences</p>
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => navigate(`/family/${invitation.families.slug}`)}
                className="w-full"
                size="lg"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Explore Your Family
              </Button>
            </CardContent>
          </Card>
        </div>

        <FamilyJoinOnboarding
          open={showJoinOnboarding}
          onComplete={() => setShowJoinOnboarding(false)}
          familyName={invitation.families.name}
          role={invitation.role}
          userName={user?.user_metadata?.full_name}
        />
      </div>
    );
  }

  // Preview / Accept screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-4">
        {/* Family Header Card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 border-2 border-background shadow-lg">
                {invitation.families.logo_url ? (
                  <AvatarImage src={invitation.families.logo_url} alt={invitation.families.name} />
                ) : null}
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {invitation.families.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Badge variant="secondary" className="mb-1">
                  <Users className="w-3 h-3 mr-1" />
                  Family Invitation
                </Badge>
                <h1 className="text-xl font-bold">{invitation.families.name}</h1>
                {invitation.families.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {invitation.families.description}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <CardContent className="p-6 space-y-6">
            {/* Inviter Info */}
            {invitation.inviter && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={invitation.inviter.avatar_url} />
                  <AvatarFallback>
                    {invitation.inviter.full_name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{invitation.inviter.full_name}</p>
                  <p className="text-xs text-muted-foreground">invited you to join</p>
                </div>
              </div>
            )}

            {/* Role & Benefits */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">
                  Your role: <span className="text-primary">{invitation.role.replace("_", " ").toUpperCase()}</span>
                </span>
              </div>
              
              <div className="space-y-2">
                {getRoleBenefits(invitation.role).map((benefit, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <benefit.icon className="w-4 h-4 text-primary" />
                    <span>{benefit.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Expiration */}
            <p className="text-xs text-muted-foreground text-center">
              This invitation expires on {new Date(invitation.expires_at).toLocaleDateString()}
            </p>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleAccept}
                disabled={processing}
                className="flex-1"
                size="lg"
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Join Family
              </Button>
              <Button
                onClick={handleDecline}
                disabled={processing}
                variant="outline"
                size="lg"
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Heritage Info (if available) */}
        {invitation.families.heritage_info && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Heart className="w-4 h-4" />
                About This Family
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{invitation.families.heritage_info}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AcceptInvitation;
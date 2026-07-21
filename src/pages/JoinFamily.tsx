import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, CheckCircle, AlertCircle, ArrowRight, Sparkles, Shield, Calendar, Wallet, Eye, Edit, Lock } from "lucide-react";
import { PermissionExplanation } from "@/components/invitations/PermissionExplanation";
import SEO from "@/components/SEO";

interface FamilyInfo {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  member_count?: number;
}

const JoinFamily = () => {
  const navigate = useNavigate();
  const { familySlug } = useParams();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [referenceCode, setReferenceCode] = useState(searchParams.get("code") || "");
  const [codeValidating, setCodeValidating] = useState(false);
  const [validatedFamily, setValidatedFamily] = useState<FamilyInfo | null>(null);
  const [codeError, setCodeError] = useState("");
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState<"code" | "info" | "success">("code");
  
  // Form data for non-authenticated users
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    message: "",
  });

  useEffect(() => {
    checkAuth();
    
    // Auto-validate code if provided in URL
    if (searchParams.get("code")) {
      validateCode(searchParams.get("code")!);
    }
    
    // Check clipboard for codes
    checkClipboard();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUser(session.user);
      
      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      
      if (profile) {
        setFormData({
          fullName: profile.full_name || "",
          email: profile.email || session.user.email || "",
          phone: profile.phone || "",
          message: "",
        });
      }
    }
    setLoading(false);
  };

  const checkClipboard = async () => {
    try {
      // Only check clipboard if we have focus and permission
      if (document.hasFocus()) {
        const text = await navigator.clipboard.readText();
        // Check if clipboard contains a valid-looking code (8 alphanumeric chars)
        if (/^[A-Z0-9]{8}$/i.test(text.trim()) && !referenceCode) {
          setReferenceCode(text.trim().toUpperCase());
          toast({
            title: "Invitation code detected",
            description: `Found "${text.trim().toUpperCase()}" in clipboard. Validating...`,
          });
          validateCode(text.trim().toUpperCase());
        }
      }
    } catch {
      // Clipboard access denied - ignore silently
    }
  };

  const validateCode = async (code: string) => {
    if (!code || code.length < 6) {
      setCodeError("");
      setValidatedFamily(null);
      return;
    }

    setCodeValidating(true);
    setCodeError("");

    try {
      // Look up the invitation by reference code
      const { data: invitation, error } = await supabase
        .from("invitations")
        .select(`
          *,
          families:family_id (
            id,
            name,
            slug,
            description,
            logo_url
          )
        `)
        .eq("reference_code", code.toUpperCase())
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .single();

      if (error || !invitation) {
        setCodeError("Invalid or expired code. Please check and try again.");
        setValidatedFamily(null);
        return;
      }

      setValidatedFamily({
        id: invitation.families.id,
        name: invitation.families.name,
        slug: invitation.families.slug,
        description: invitation.families.description,
        logo_url: invitation.families.logo_url,
      });
      
      setStep("info");
    } catch (error) {
      setCodeError("Error validating code. Please try again.");
    } finally {
      setCodeValidating(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!validatedFamily) return;
    
    // Validate required fields
    if (!formData.fullName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name",
        variant: "destructive",
      });
      return;
    }

    if (!user && !formData.email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Create join request
      const { error } = await supabase.from("join_requests").insert({
        family_id: validatedFamily.id,
        user_id: user?.id || null,
        email: formData.email || user?.email,
        full_name: formData.fullName,
        phone: formData.phone || null,
        message: formData.message || null,
        reference_code_used: referenceCode.toUpperCase(),
      });

      if (error) throw error;

      setStep("success");
      
      toast({
        title: "Request Sent!",
        description: "The family administrator will review your request.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit request",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinAsGuest = () => {
    navigate(`/auth?redirect=${encodeURIComponent(`/join/${familySlug || "family"}?code=${referenceCode}`)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 flex items-center justify-center p-4">
      <SEO
        title="Join a family"
        description="Enter your invitation code to join a Kinsroot family and start sharing meetings, contributions and savings together."
      />
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-6">
          <img 
            src="/logo.jpg" 
            alt="Family Together" 
            className="w-16 h-16 mx-auto rounded-full shadow-lg mb-4"
          />
          <h1 className="text-2xl font-bold text-foreground">Join a Family</h1>
          <p className="text-muted-foreground">Enter your invitation code to get started</p>
        </div>

        {/* Step: Enter Code */}
        {step === "code" && (
          <>
          <h2 className="sr-only">Enter your invitation code</h2>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Enter Invitation Code
              </CardTitle>
              <CardDescription>
                Enter the reference code shared by your family member
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="code">Reference Code</Label>
                <Input
                  id="code"
                  placeholder="e.g., ABC12345"
                  value={referenceCode}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                    setReferenceCode(value);
                    setCodeError("");
                    if (value.length >= 8) {
                      validateCode(value);
                    }
                  }}
                  maxLength={8}
                  className={`text-center text-xl tracking-widest font-mono ${
                    codeError ? "border-red-500" : validatedFamily ? "border-green-500" : ""
                  }`}
                />
                {codeError && (
                  <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {codeError}
                  </p>
                )}
                {codeValidating && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Validating code...
                  </p>
                )}
              </div>

              <Button 
                onClick={() => validateCode(referenceCode)}
                disabled={referenceCode.length < 6 || codeValidating}
                className="w-full"
              >
                {codeValidating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                Continue
              </Button>

              <div className="text-center pt-4 border-t space-y-3">
                <p className="text-sm text-muted-foreground">Don't have a code?</p>
                <Button variant="link" onClick={() => navigate("/dashboard")}>
                  Go to Dashboard
                </Button>
                <p className="text-xs text-muted-foreground">
                  Using a code will send a join request to the family administrator for approval.
                </p>
              </div>
            </CardContent>
          </Card>
          </>
        )}

        {/* Step: Confirm & Request */}
        {step === "info" && validatedFamily && (
          <div className="space-y-4">
            {/* Family Preview Card */}
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                  {validatedFamily.logo_url ? (
                    <img src={validatedFamily.logo_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <Users className="w-8 h-8 text-primary" />
                  )}
                </div>
                <h2 className="text-xl font-bold mb-1">{validatedFamily.name}</h2>
                {validatedFamily.description && (
                  <p className="text-sm text-muted-foreground">{validatedFamily.description}</p>
                )}
                <Badge variant="secondary" className="mt-3">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Valid invitation
                </Badge>
              </CardContent>
            </Card>

            {/* What joining means - Expanded with permissions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  What you'll get as a member
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* View permissions */}
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Eye className="w-4 h-4 text-primary" />
                    What you can view
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 ml-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-3 h-3 text-primary shrink-0" />
                      <span>Family meetings & schedules</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-3 h-3 text-primary shrink-0" />
                      <span>Member directory & contacts</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-3 h-3 text-primary shrink-0" />
                      <span>Your own contributions & history</span>
                    </div>
                  </div>
                </div>

                {/* Edit permissions */}
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Edit className="w-4 h-4 text-primary" />
                    What you can edit
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 ml-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-3 h-3 text-primary shrink-0" />
                      <span>Your personal profile</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-3 h-3 text-primary shrink-0" />
                      <span>Your meeting attendance</span>
                    </div>
                  </div>
                </div>

                {/* Visibility */}
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Lock className="w-4 h-4 text-primary" />
                    Who can see your profile
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 ml-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-3 h-3 shrink-0" />
                      <span>All family members can see your name & contact</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Shield className="w-3 h-3 shrink-0" />
                      <span>Admins can view your financial records</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Request Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your Information</CardTitle>
                <CardDescription>
                  {user 
                    ? "Confirm your details before requesting to join"
                    : "Enter your details to request to join"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>

                {!user && (
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+237 6XX XXX XXX"
                  />
                </div>

                <div>
                  <Label htmlFor="message">Message (optional)</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Hi! I'd love to join the family..."
                    rows={2}
                  />
                </div>

                <Button 
                  onClick={handleSubmitRequest}
                  disabled={submitting}
                  className="w-full"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  {user ? "Request to Join" : "Send Join Request"}
                </Button>

                {!user && (
                  <p className="text-xs text-muted-foreground text-center">
                    Already have an account?{" "}
                    <Button variant="link" className="p-0 h-auto" onClick={handleJoinAsGuest}>
                      Sign in first
                    </Button>
                  </p>
                )}
              </CardContent>
            </Card>

            <Button 
              variant="ghost" 
              onClick={() => {
                setStep("code");
                setValidatedFamily(null);
              }}
              className="w-full"
            >
              ← Enter a different code
            </Button>
          </div>
        )}

        {/* Step: Success */}
        {step === "success" && (
          <Card className="text-center">
            <CardContent className="p-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold mb-2">Request Sent!</h2>
              <p className="text-muted-foreground mb-6">
                Your request to join <strong>{validatedFamily?.name}</strong> has been sent. 
                The family administrator will review and respond soon.
              </p>
              
              <div className="space-y-2">
                {user ? (
                  <Button onClick={() => navigate("/dashboard")} className="w-full">
                    Go to Dashboard
                  </Button>
                ) : (
                  <>
                    <Button onClick={() => navigate("/auth")} className="w-full">
                      Create Account
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Create an account to get notified when your request is approved
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default JoinFamily;

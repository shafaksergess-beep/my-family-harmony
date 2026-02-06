import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, Users, ArrowRight, Sparkles } from "lucide-react";

interface FamilyPreview {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  heritage_info?: string;
}

interface LightweightJoinFormProps {
  family: FamilyPreview;
  referenceCode?: string;
  onSuccess?: () => void;
}

export const LightweightJoinForm = ({ family, referenceCode, onSuccess }: LightweightJoinFormProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "success">("form");
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    message: "",
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setIsLoggedIn(true);
      setCurrentUser(session.user);
      // Pre-fill from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, phone")
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your full name",
        variant: "destructive",
      });
      return;
    }

    if (!formData.email && !formData.phone) {
      toast({
        title: "Contact Required",
        description: "Please provide an email or phone number",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Create join request
      const { error } = await supabase.from("join_requests").insert({
        family_id: family.id,
        full_name: formData.fullName.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        message: formData.message.trim() || null,
        reference_code_used: referenceCode || null,
        user_id: currentUser?.id || null,
        status: "pending",
      });

      if (error) throw error;

      setStep("success");
      toast({
        title: "Request Submitted!",
        description: "The family administrators will review your request.",
      });

      onSuccess?.();
    } catch (error: any) {
      console.error("Join request error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit request",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const familyInitials = family.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (step === "success") {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-8 pb-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
          <h2 className="text-xl font-bold mb-2">Request Submitted!</h2>
          <p className="text-muted-foreground mb-6">
            Your request to join <strong>{family.name}</strong> has been sent to the family administrators.
          </p>
          <div className="p-4 bg-muted rounded-lg mb-6">
            <p className="text-sm text-muted-foreground">
              <strong>What happens next?</strong>
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1 text-left">
              <li>• A family admin will review your request</li>
              <li>• You'll receive a notification when approved</li>
              <li>• You can then complete your full profile</li>
            </ul>
          </div>
          {!isLoggedIn && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Create an account to track your request and get notified
              </p>
              <Button onClick={() => navigate("/auth")} className="w-full">
                Create Account
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
          {isLoggedIn && (
            <Button onClick={() => navigate("/dashboard")} variant="outline" className="w-full">
              Go to Dashboard
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={family.logo_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
              {familyInitials}
            </AvatarFallback>
          </Avatar>
        </div>
        <CardTitle className="text-xl">Join {family.name}</CardTitle>
        <CardDescription>
          Enter your basic info to request membership
        </CardDescription>
        {referenceCode && (
          <Badge variant="outline" className="mt-2 font-mono">
            Code: {referenceCode}
          </Badge>
        )}
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="your@email.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 234 567 8900"
            />
            <p className="text-xs text-muted-foreground">
              Provide at least an email or phone number
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Introduction (Optional)</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Tell us a bit about yourself and your connection to the family..."
              rows={3}
            />
          </div>

          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 mt-0.5 text-primary" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Quick & Easy Process</p>
                <p>Submit now, create a full account later. Your request goes directly to family administrators.</p>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                Request to Join
              </>
            )}
          </Button>
          {!isLoggedIn && (
            <Button
              type="button"
              variant="ghost"
              className="w-full text-sm"
              onClick={() => navigate("/auth")}
            >
              Already have an account? Sign in
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
};

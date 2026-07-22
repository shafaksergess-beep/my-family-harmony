import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, Ticket, ArrowRight, Eye, EyeOff } from "lucide-react";
import { loginSchema, signupSchema } from "@/lib/validation";
import { checkRateLimit, recordAttempt, resetRateLimit } from "@/lib/rateLimit";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import SEO from "@/components/SEO";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordStrength } from "@/components/PasswordStrength";
import { lovable } from "@/integrations/lovable";
import {
  syncUserProfile,
  stashOAuthRedirect,
  consumeOAuthRedirect,
  describeOAuthError,
} from "@/lib/authSync";

interface PendingInvitation {
  familyName: string;
  inviterName?: string;
  role: string;
}

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const { isLoaded: recaptchaLoaded, getRecaptchaToken } = useRecaptcha();

  // Get redirect URL from query params
  const redirectUrl = searchParams.get("redirect") || "/dashboard";
  
  // Pending invitation context
  const [pendingInvitation, setPendingInvitation] = useState<PendingInvitation | null>(null);

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string }>({});

  // Signup form state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [signupFullName, setSignupFullName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupErrors, setSignupErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    fullName?: string;
    phone?: string;
  }>({});
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [privacyError, setPrivacyError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate(redirectUrl);
      }
      setCheckingAuth(false);
    };

    checkAuth();

    // Check for pending invitation context
    checkPendingInvitation();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        try {
          const { isNewProfile } = await syncUserProfile(session.user);
          if (isNewProfile) {
            localStorage.setItem("family-together-first-login", "true");
          }
        } catch (e) {
          console.warn("profile sync failed", e);
        }
        const stashed = consumeOAuthRedirect();
        navigate(stashed || redirectUrl, { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, redirectUrl]);

  const checkPendingInvitation = async () => {
    // Check if redirect contains invitation token
    if (redirectUrl.includes("accept-invitation") && redirectUrl.includes("token=")) {
      const tokenMatch = redirectUrl.match(/token=([^&]+)/);
      if (tokenMatch) {
        try {
          const { data } = await supabase
            .from("invitations")
            .select(`
              role,
              families:family_id (name),
              profiles:invited_by (full_name)
            `)
            .eq("token", tokenMatch[1])
            .eq("status", "pending")
            .single();

          if (data) {
            setPendingInvitation({
              familyName: (data.families as any)?.name || "the family",
              inviterName: (data.profiles as any)?.full_name,
              role: data.role,
            });
          }
        } catch (error) {
          // Invitation lookup failed - continue without context
        }
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrors({});
    
    // Validate input
    const result = loginSchema.safeParse({
      email: loginEmail,
      password: loginPassword,
    });

    if (!result.success) {
      const errors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === "email") errors.email = err.message;
        if (err.path[0] === "password") errors.password = err.message;
      });
      setLoginErrors(errors);
      return;
    }

    // Check rate limit
    const rateLimitCheck = checkRateLimit(result.data.email);
    if (rateLimitCheck.isBlocked) {
      const minutes = Math.ceil(rateLimitCheck.remainingTime! / 60);
      toast({
        title: "Too many attempts",
        description: `Please wait ${minutes} minute(s) before trying again`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Get reCAPTCHA token
      const recaptchaToken = await getRecaptchaToken("login");
      if (!recaptchaToken) {
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: result.data.email,
        password: result.data.password,
      });

      if (error) {
        // Record failed attempt
        recordAttempt(result.data.email);
        
        const remainingAttempts = checkRateLimit(result.data.email).attemptsRemaining;
        throw new Error(
          error.message + 
          (remainingAttempts !== undefined ? ` (${remainingAttempts} attempts remaining)` : "")
        );
      }

      // Reset rate limit on successful login
      resetRateLimit(result.data.email);

      toast({
        title: "Welcome back!",
        description: "You've successfully logged in.",
      });
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupErrors({});
    setPrivacyError(null);

    if (!acceptedPrivacy) {
      setPrivacyError("Please accept the Privacy Policy and Terms to continue");
      return;
    }

    // Check confirm password match first
    if (signupPassword !== signupConfirmPassword) {
      setSignupErrors({ confirmPassword: "Passwords do not match" });
      return;
    }
    
    // Validate input
    const result = signupSchema.safeParse({
      email: signupEmail,
      password: signupPassword,
      fullName: signupFullName,
      phone: signupPhone || undefined,
    });

    if (!result.success) {
      const errors: {
        email?: string;
        password?: string;
        fullName?: string;
        phone?: string;
      } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === "email") errors.email = err.message;
        if (err.path[0] === "password") errors.password = err.message;
        if (err.path[0] === "fullName") errors.fullName = err.message;
        if (err.path[0] === "phone") errors.phone = err.message;
      });
      setSignupErrors(errors);
      return;
    }

    // Check rate limit for signup attempts
    const rateLimitCheck = checkRateLimit(result.data.email);
    if (rateLimitCheck.isBlocked) {
      const minutes = Math.ceil(rateLimitCheck.remainingTime! / 60);
      toast({
        title: "Too many attempts",
        description: `Please wait ${minutes} minute(s) before trying again`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Get reCAPTCHA token
      const recaptchaToken = await getRecaptchaToken("signup");
      if (!recaptchaToken) {
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email: result.data.email,
        password: result.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: result.data.fullName,
            phone: result.data.phone,
          },
        },
      });

      if (error) {
        // Record failed attempt
        recordAttempt(result.data.email);
        throw error;
      }

      // Reset rate limit on successful signup
      resetRateLimit(result.data.email);

      // Mark as first-time user for onboarding
      localStorage.setItem("family-together-first-login", "true");

      toast({
        title: "Account created!",
        description: "Welcome to Family Together. Please check your email to verify your account.",
      });

      // Switch to login tab
      setLoginEmail(result.data.email);
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 flex items-center justify-center p-4">
      <SEO title="Sign in" description="Sign in or create your Kinsroot account to manage your family's meetings, contributions and savings." />
      <div className="w-full max-w-md">
        {/* Pending Invitation Banner */}
        {pendingInvitation && (
          <Card className="mb-4 p-4 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {pendingInvitation.inviterName 
                    ? `${pendingInvitation.inviterName} invited you to join`
                    : "You've been invited to join"
                  }
                </p>
                <p className="text-sm text-primary font-semibold">{pendingInvitation.familyName}</p>
              </div>
              <Badge variant="secondary">
                {pendingInvitation.role.replace("_", " ")}
              </Badge>
            </div>
          </Card>
        )}

        <div className="text-center mb-8">
          <div className="mb-4">
            <img 
              src="/logo.jpg" 
              alt="Family Together Logo" 
              className="w-24 h-24 mx-auto rounded-full object-cover shadow-lg"
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Family Together — Heritage-rooted family management</h1>
          <h2 className="sr-only">Sign in to your account or create a new one</h2>
          <p className="text-muted-foreground">
            {pendingInvitation 
              ? "Sign in or create an account to accept your invitation"
              : "Manage your family reunion with ease"
            }
          </p>
        </div>

        <Card className="p-6 shadow-xl">
          <div className="space-y-2 mb-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  const result = await lovable.auth.signInWithOAuth("google", {
                    redirect_uri: window.location.origin,
                  });
                  if (result.error) throw new Error(result.error.message || "Google sign-in failed");
                  if (result.redirected) return;
                } catch (err: any) {
                  toast({ title: "Google sign-in failed", description: err.message, variant: "destructive" });
                } finally {
                  setLoading(false);
                }
              }}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  const result = await lovable.auth.signInWithOAuth("apple", {
                    redirect_uri: window.location.origin,
                  });
                  if (result.error) throw new Error(result.error.message || "Apple sign-in failed");
                  if (result.redirected) return;
                } catch (err: any) {
                  toast({ title: "Apple sign-in failed", description: err.message, variant: "destructive" });
                } finally {
                  setLoading(false);
                }
              }}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.05 20.28c-.98.95-2.05.86-3.08.4-1.09-.47-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Continue with Apple
            </Button>
          </div>
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
            </div>
          </div>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      setLoginErrors({ ...loginErrors, email: undefined });
                    }}
                    className={loginErrors.email ? "border-destructive" : ""}
                  />
                  {loginErrors.email && (
                    <p className="text-sm text-destructive">{loginErrors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => {
                        setLoginPassword(e.target.value);
                        setLoginErrors({ ...loginErrors, password: undefined });
                      }}
                      className={`pr-10 ${loginErrors.password ? "border-destructive" : ""}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      tabIndex={-1}
                      aria-label={showLoginPassword ? "Hide password" : "Show password"}
                    >
                      {showLoginPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {loginErrors.password && (
                    <p className="text-sm text-destructive">{loginErrors.password}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    "Login"
                  )}
                </Button>

                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm text-muted-foreground hover:text-primary p-0 h-auto"
                    onClick={() => {
                      setShowForgotPassword(true);
                      setForgotEmail(loginEmail);
                      setForgotSent(false);
                    }}
                  >
                    Forgot your password?
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={signupFullName}
                    onChange={(e) => {
                      setSignupFullName(e.target.value);
                      setSignupErrors({ ...signupErrors, fullName: undefined });
                    }}
                    className={signupErrors.fullName ? "border-destructive" : ""}
                  />
                  {signupErrors.fullName && (
                    <p className="text-sm text-destructive">{signupErrors.fullName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={signupEmail}
                    onChange={(e) => {
                      setSignupEmail(e.target.value);
                      setSignupErrors({ ...signupErrors, email: undefined });
                    }}
                    className={signupErrors.email ? "border-destructive" : ""}
                  />
                  {signupErrors.email && (
                    <p className="text-sm text-destructive">{signupErrors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Phone (optional)</Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    placeholder="+237 6XX XXX XXX"
                    value={signupPhone}
                    onChange={(e) => {
                      setSignupPhone(e.target.value);
                      setSignupErrors({ ...signupErrors, phone: undefined });
                    }}
                    className={signupErrors.phone ? "border-destructive" : ""}
                  />
                  {signupErrors.phone && (
                    <p className="text-sm text-destructive">{signupErrors.phone}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showSignupPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => {
                        setSignupPassword(e.target.value);
                        setSignupErrors({ ...signupErrors, password: undefined });
                      }}
                      className={`pr-10 ${signupErrors.password ? "border-destructive" : ""}`}
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      tabIndex={-1}
                      aria-label={showSignupPassword ? "Hide password" : "Show password"}
                    >
                      {showSignupPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {signupErrors.password && (
                    <p className="text-sm text-destructive">{signupErrors.password}</p>
                  )}
                  <PasswordStrength password={signupPassword} />
                  <p className="text-xs text-muted-foreground">
                    Must contain uppercase, lowercase, and number
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-confirm-password"
                      type={showSignupConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={signupConfirmPassword}
                      onChange={(e) => {
                        setSignupConfirmPassword(e.target.value);
                        setSignupErrors({ ...signupErrors, confirmPassword: undefined });
                      }}
                      className={`pr-10 ${signupErrors.confirmPassword ? "border-destructive" : ""}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                      tabIndex={-1}
                      aria-label={showSignupConfirmPassword ? "Hide password confirmation" : "Show password confirmation"}
                    >
                      {showSignupConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {signupErrors.confirmPassword && (
                    <p className="text-sm text-destructive">{signupErrors.confirmPassword}</p>
                  )}
                  {signupConfirmPassword && signupPassword === signupConfirmPassword && (
                    <p className="text-xs text-primary">✓ Passwords match</p>
                  )}
                </div>

                <div className="flex items-start gap-2 pt-1">
                  <Checkbox
                    id="accept-privacy"
                    checked={acceptedPrivacy}
                    onCheckedChange={(v) => {
                      setAcceptedPrivacy(v === true);
                      if (v === true) setPrivacyError(null);
                    }}
                    aria-describedby={privacyError ? "privacy-error" : undefined}
                  />
                  <Label htmlFor="accept-privacy" className="text-sm font-normal leading-snug cursor-pointer">
                    I agree to the{" "}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                      Privacy Policy
                    </a>{" "}
                    and Terms of Service.
                  </Label>
                </div>
                {privacyError && (
                  <p id="privacy-error" className="text-sm text-destructive">{privacyError}</p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          {/* Have a code section */}
          <div className="mt-6 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => navigate("/join")}
              className="w-full"
            >
              <Ticket className="w-4 h-4 mr-2" />
              Have an invitation code?
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Button>
          </div>
        </Card>

        {/* Forgot Password Dialog */}
        {showForgotPassword && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForgotPassword(false)}>
            <Card className="p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
              {forgotSent ? (
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Check your email</h3>
                  <p className="text-sm text-muted-foreground">
                    If an account exists with that email, we've sent a password reset link. Please check your inbox and spam folder.
                  </p>
                  <Button variant="outline" className="w-full" onClick={() => setShowForgotPassword(false)}>
                    Back to Login
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Reset Password</h3>
                    <p className="text-sm text-muted-foreground">Enter your email and we'll send you a reset link.</p>
                  </div>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!forgotEmail.trim()) return;
                      setForgotLoading(true);
                      try {
                        const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
                          redirectTo: `${window.location.origin}/reset-password`,
                        });
                        if (error) throw error;
                        setForgotSent(true);
                      } catch (error: any) {
                        // Always show success to prevent email enumeration
                        setForgotSent(true);
                      } finally {
                        setForgotLoading(false);
                      }
                    }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">Email Address</Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        autoFocus
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForgotPassword(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" className="flex-1" disabled={forgotLoading}>
                        {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Reset Link"}
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </Card>
          </div>
        )}

        <div className="text-center mt-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-muted-foreground"
          >
            Back to home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Auth;

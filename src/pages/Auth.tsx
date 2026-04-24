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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate(redirectUrl);
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Family Together</h1>
          <p className="text-muted-foreground">
            {pendingInvitation 
              ? "Sign in or create an account to accept your invitation"
              : "Manage your family reunion with ease"
            }
          </p>
        </div>

        <Card className="p-6 shadow-xl">
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

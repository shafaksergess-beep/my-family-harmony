import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { loginSchema, signupSchema } from "@/lib/validation";
import { checkRateLimit, recordAttempt, resetRateLimit } from "@/lib/rateLimit";
import { useRecaptcha } from "@/hooks/useRecaptcha";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const { isLoaded: recaptchaLoaded, getRecaptchaToken } = useRecaptcha();

  // Get redirect URL from query params
  const redirectUrl = searchParams.get("redirect") || "/dashboard";

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string }>({});

  // Signup form state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupFullName, setSignupFullName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupErrors, setSignupErrors] = useState<{
    email?: string;
    password?: string;
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

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate(redirectUrl);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, redirectUrl]);

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

      toast({
        title: "Account created!",
        description: "Welcome to Family Together. You can now log in.",
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
      <div className="w-full max-w-md">
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
            Manage your family reunion with ease
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
                    className={loginErrors.email ? "border-red-500" : ""}
                  />
                  {loginErrors.email && (
                    <p className="text-sm text-red-500">{loginErrors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      setLoginErrors({ ...loginErrors, password: undefined });
                    }}
                    className={loginErrors.password ? "border-red-500" : ""}
                  />
                  {loginErrors.password && (
                    <p className="text-sm text-red-500">{loginErrors.password}</p>
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
                    className={signupErrors.fullName ? "border-red-500" : ""}
                  />
                  {signupErrors.fullName && (
                    <p className="text-sm text-red-500">{signupErrors.fullName}</p>
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
                    className={signupErrors.email ? "border-red-500" : ""}
                  />
                  {signupErrors.email && (
                    <p className="text-sm text-red-500">{signupErrors.email}</p>
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
                    className={signupErrors.phone ? "border-red-500" : ""}
                  />
                  {signupErrors.phone && (
                    <p className="text-sm text-red-500">{signupErrors.phone}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => {
                      setSignupPassword(e.target.value);
                      setSignupErrors({ ...signupErrors, password: undefined });
                    }}
                    className={signupErrors.password ? "border-red-500" : ""}
                    minLength={6}
                  />
                  {signupErrors.password && (
                    <p className="text-sm text-red-500">{signupErrors.password}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Must contain uppercase, lowercase, and number
                  </p>
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
        </Card>

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

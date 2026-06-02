import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogOut, Plus, Users, Building2, Shield, FileText, User as UserIcon, Activity } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { CurrencySelector } from "@/components/CurrencySelector";
import { usePlatform } from "@/hooks/usePlatform";
import { MobileDashboard } from "@/components/mobile/MobileDashboard";
import { JoinFamilyCard } from "@/components/dashboard/JoinFamilyCard";
import { NewUserOnboarding } from "@/components/onboarding/NewUserOnboarding";
import { NotificationsFeed } from "@/components/dashboard/NotificationsFeed";
import { PendingActionsWidget } from "@/components/dashboard/PendingActionsWidget";
import { FinancialOverviewWidget } from "@/components/dashboard/FinancialOverviewWidget";
import { FamilyChatbot } from "@/components/chat/FamilyChatbot";
import SEO from "@/components/SEO";

interface UserFamily {
  family_id: string;
  family_name: string;
  family_slug: string;
  user_role: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isMobile } = usePlatform();
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userFamilies, setUserFamilies] = useState<UserFamily[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [userId, setUserId] = useState<string>("");
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Get user profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      setProfile(profileData);
      setUserId(session.user.id);

      // Check if super admin
      const { data: superAdminData } = await supabase
        .from("super_admins")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      setIsSuperAdmin(!!superAdminData);

      // Get user's families
      const { data: familiesData, error } = await supabase.rpc("get_user_families", {
        check_user_id: session.user.id,
      });

      if (error) {
        console.error("Error fetching families:", error);
      } else {
        setUserFamilies(familiesData || []);
      }
      // Check for first-time user onboarding
      const isFirstLogin = localStorage.getItem("family-together-first-login");
      if (isFirstLogin) {
        setShowOnboarding(true);
        localStorage.removeItem("family-together-first-login");
      }
    } catch (error) {
      console.error("Auth check error:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You've been successfully logged out.",
    });
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show mobile dashboard on mobile devices (for non-super-admins)
  if (isMobile && !isSuperAdmin) {
    return <MobileDashboard />;
  }

  return (
    <>
    <SEO title="My Family Tree" description="Your Kinsroot dashboard — view your families, contributions, meetings and recent activity at a glance." />
    <NewUserOnboarding
      open={showOnboarding}
      onComplete={() => setShowOnboarding(false)}
      userName={profile?.full_name}
    />
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src="/logo.jpg" 
                alt="Family Together Logo" 
                className="w-12 h-12 rounded-full object-cover shadow-md cursor-pointer"
                onClick={() => navigate("/dashboard")}
              />
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  My Family Dashboard
                </h1>
                <p className="text-sm text-muted-foreground">
                  Welcome, {profile?.full_name || "User"}!
                </p>
                {isSuperAdmin && (
                  <p className="text-sm text-secondary font-medium">Super Administrator</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
                <UserIcon className="w-4 h-4 mr-2" />
                Profile
              </Button>
              <LanguageSwitcher />
              <CurrencySelector />
              <Button variant="ghost" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Member Quick Stats */}
        {userFamilies.length > 0 && !isSuperAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Families</p>
                  <p className="text-2xl font-bold">{userFamilies.length}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded">
                  <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">{userFamilies.filter(f => f.user_role !== 'guest').length}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded">
                  <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Leadership</p>
                  <p className="text-2xl font-bold">
                    {userFamilies.filter(f => ['family_head', 'treasurer', 'loan_committee'].includes(f.user_role)).length}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded">
                  <Building2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Member</p>
                  <p className="text-2xl font-bold">
                    {userFamilies.filter(f => f.user_role === 'member').length}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}
        {/* Super Admin Section */}
        {isSuperAdmin && (
          <Card className="p-6 mb-8 border-secondary/30 bg-gradient-to-r from-secondary/5 to-secondary/10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-secondary" />
                  Super Admin Panel
                </h2>
                <p className="text-muted-foreground">
                  Manage all families and system-wide settings
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Button
                variant="default"
                className="justify-start"
                onClick={() => navigate("/admin/dashboard")}
              >
                <Activity className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => navigate("/admin/families")}
              >
                <Building2 className="w-4 h-4 mr-2" />
                Manage Families
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => navigate("/admin/permissions")}
              >
                <Shield className="w-4 h-4 mr-2" />
                Permissions Overview
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => navigate("/admin/activity-logs")}
              >
                <FileText className="w-4 h-4 mr-2" />
                Activity Logs
              </Button>
            </div>
          </Card>
        )}

        {/* User's Families */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Your Families</h2>
            {!isSuperAdmin && userFamilies.length === 0 && (
              <p className="text-muted-foreground">
                Contact your family administrator to be added to a family
              </p>
            )}
          </div>

          {userFamilies.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-12 text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2 text-foreground">
                  No families yet
                </h3>
                <p className="text-muted-foreground mb-6">
                  You haven't been added to any family yet.
                  {isSuperAdmin && " As a super admin, you can create a new family."}
                </p>
                {isSuperAdmin && (
                  <Button onClick={() => navigate("/admin/families")}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Family
                  </Button>
                )}
              </Card>
              {/* Join Family Card */}
              {!isSuperAdmin && <JoinFamilyCard />}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userFamilies.map((family) => (
                <Card
                  key={family.family_id}
                  className="p-6 hover:shadow-lg transition-all cursor-pointer border-primary/20 hover:border-primary/40"
                  onClick={() => navigate(`/family/${family.family_slug}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <Building2 className="w-10 h-10 text-primary" />
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                      {family.user_role.replace("_", " ").toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-foreground">
                    {family.family_name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Click to view family details and management
                  </p>
                  <Button className="w-full" variant="outline">
                    Open Family
                  </Button>
                </Card>
              ))}
              {/* Join Family Card - also show when user has families */}
              {!isSuperAdmin && <JoinFamilyCard />}
            </div>
          )}
        </div>

        {/* Member Dashboard Widgets */}
        {!isSuperAdmin && userFamilies.length > 0 && userId && (
          <div className="mt-8 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PendingActionsWidget userId={userId} families={userFamilies} />
              <NotificationsFeed userId={userId} familyIds={userFamilies.map(f => f.family_id)} />
            </div>
            <FinancialOverviewWidget userId={userId} families={userFamilies} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-12">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          Developed by{' '}
          <a href="mailto:softserge.dev@gmail.com" className="text-primary hover:underline font-medium">
            Softserge
          </a>
          . © {new Date().getFullYear()} All rights reserved.
        </div>
      </footer>

      {userId && <FamilyChatbot />}
    </div>
    </>
  );
};

export default Dashboard;

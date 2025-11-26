import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogOut, Plus, Users, Building2 } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface UserFamily {
  family_id: string;
  family_name: string;
  family_slug: string;
  user_role: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userFamilies, setUserFamilies] = useState<UserFamily[]>([]);
  const [profile, setProfile] = useState<any>(null);

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Welcome, {profile?.full_name || "User"}!
              </h1>
              {isSuperAdmin && (
                <p className="text-sm text-secondary font-medium">Super Administrator</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
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
        {/* Super Admin Section */}
        {isSuperAdmin && (
          <Card className="p-6 mb-8 border-secondary/30 bg-gradient-to-r from-secondary/5 to-secondary/10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-secondary" />
                  Super Admin Panel
                </h2>
                <p className="text-muted-foreground">
                  Manage all families and system-wide settings
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => navigate("/admin/families")}
              >
                <Plus className="w-4 h-4 mr-2" />
                Manage Families
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
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

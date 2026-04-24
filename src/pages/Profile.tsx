import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, User, Save, Users, Hash, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { JoinFamilyOptions } from "@/components/invitations/JoinFamilyOptions";
import SEO from "@/components/SEO";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    preferred_language: "en",
    is_working: false,
  });
  const [showJoinFamily, setShowJoinFamily] = useState(false);
  const [userFamilies, setUserFamilies] = useState<any[]>([]);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Load profile and families in parallel
      const [profileResult, familiesResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single(),
        supabase
          .from("family_members")
          .select(`
            id,
            role,
            families:family_id (id, name, slug, logo_url)
          `)
          .eq("user_id", session.user.id),
      ]);

      if (profileResult.error) throw profileResult.error;

      setProfile(profileResult.data);
      setFormData({
        full_name: profileResult.data.full_name || "",
        email: profileResult.data.email || "",
        phone: profileResult.data.phone || "",
        preferred_language: profileResult.data.preferred_language || "en",
        is_working: profileResult.data.is_working || false,
      });

      if (familiesResult.data) {
        setUserFamilies(familiesResult.data);
      }

      // Set language from profile
      if (profileResult.data.preferred_language) {
        i18n.changeLanguage(profileResult.data.preferred_language);
      }
    } catch (error: any) {
      console.error("Error loading profile:", error);
      toast({
        title: t("common.error"),
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          preferred_language: formData.preferred_language,
          is_working: formData.is_working,
        })
        .eq("id", session.user.id);

      if (error) throw error;

      // Update language
      i18n.changeLanguage(formData.preferred_language);
      localStorage.setItem("preferredLanguage", formData.preferred_language);

      toast({
        title: t("common.success"),
        description: "Profile updated successfully",
      });

      loadProfile();
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast({
        title: t("common.error"),
        description: error.message || "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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
      <SEO title="My profile" description="Manage your Kinsroot profile, language and family memberships." />
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("common.back")}
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <User className="w-6 h-6" />
                  User Profile
                </h1>
                <p className="text-sm text-muted-foreground">Manage your personal information</p>
              </div>
            </div>
            
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {/* Join Family Card */}
        <Card className="border-dashed border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Family Memberships
            </CardTitle>
            <CardDescription>
              {userFamilies.length > 0 
                ? `You're a member of ${userFamilies.length} family group${userFamilies.length > 1 ? "s" : ""}`
                : "Join a family to access shared resources"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Current families */}
            {userFamilies.length > 0 && (
              <div className="space-y-2">
                {userFamilies.map((membership: any) => (
                  <div
                    key={membership.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-background/80 cursor-pointer hover:bg-background transition-colors"
                    onClick={() => navigate(`/family/${membership.families.slug}`)}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      {membership.families.logo_url ? (
                        <img src={membership.families.logo_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <Users className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{membership.families.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {membership.role?.replace("_", " ")}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}

            {/* Join family button */}
            <Button 
              variant="outline" 
              className="w-full gap-2"
              onClick={() => setShowJoinFamily(true)}
            >
              <Hash className="w-4 h-4" />
              Join a Family
            </Button>
          </CardContent>
        </Card>

        {/* Personal Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">{t("auth.fullName")}</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")} (Read-only)</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t("auth.phone")}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+237 6XX XXX XXX"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Preferred Language</Label>
                <Select 
                  value={formData.preferred_language} 
                  onValueChange={(value) => setFormData({ ...formData, preferred_language: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="bota">Bota</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_working"
                  checked={formData.is_working}
                  onChange={(e) => setFormData({ ...formData, is_working: e.target.checked })}
                  className="w-4 h-4 rounded border-border"
                />
                <Label htmlFor="is_working" className="cursor-pointer">
                  Currently working (eligible for Njangi)
                </Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {t("common.save")}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>

      {/* Join Family Dialog */}
      <JoinFamilyOptions open={showJoinFamily} onOpenChange={setShowJoinFamily} />
    </div>
  );
};

export default Profile;

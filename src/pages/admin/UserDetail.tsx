import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_working: boolean | null;
}

interface FamilyMembership {
  id: string;
  family_id: string;
  role: string;
  family: {
    name: string;
    slug: string;
  };
}

export default function UserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [memberships, setMemberships] = useState<FamilyMembership[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [newMembership, setNewMembership] = useState({ family_id: "", role: "member" });

  useEffect(() => {
    checkSuperAdmin();
    fetchUserDetails();
    fetchFamilies();
  }, [userId]);

  const checkSuperAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: isSuperAdmin } = await supabase
      .rpc("is_super_admin", { check_user_id: session.user.id });

    if (!isSuperAdmin) {
      toast({
        title: "Access Denied",
        description: "You must be a super admin to access this page",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  };

  const fetchFamilies = async () => {
    const { data, error } = await supabase
      .from("families")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error fetching families:", error);
      return;
    }

    setFamilies(data || []);
  };

  const fetchUserDetails = async () => {
    if (!userId) return;

    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;

      setUser(profile);

      const { data: membershipData, error: membershipError } = await supabase
        .from("family_members")
        .select(`
          id,
          family_id,
          role,
          families:family_id (
            name,
            slug
          )
        `)
        .eq("user_id", userId);

      if (membershipError) throw membershipError;

      // Transform the data to match our interface (families -> family)
      const transformedMemberships = (membershipData || []).map((m: any) => ({
        id: m.id,
        family_id: m.family_id,
        role: m.role,
        family: Array.isArray(m.families) ? m.families[0] : m.families,
      }));

      setMemberships(transformedMemberships);
    } catch (error) {
      console.error("Error fetching user details:", error);
      toast({
        title: "Error",
        description: "Failed to fetch user details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: user.full_name,
          phone: user.phone,
          is_working: user.is_working,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddMembership = async () => {
    if (!userId || !newMembership.family_id) {
      toast({
        title: "Validation Error",
        description: "Please select a family",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("family_members")
        .insert([{
          user_id: userId,
          family_id: newMembership.family_id,
          role: newMembership.role as any,
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User added to family successfully",
      });

      setNewMembership({ family_id: "", role: "member" });
      fetchUserDetails();
    } catch (error: any) {
      console.error("Error adding membership:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add user to family",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMembership = async (membershipId: string) => {
    try {
      const { error } = await supabase
        .from("family_members")
        .delete()
        .eq("id", membershipId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User removed from family",
      });

      fetchUserDetails();
    } catch (error: any) {
      console.error("Error removing membership:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove user from family",
        variant: "destructive",
      });
    }
  };

  const handleUpdateRole = async (membershipId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from("family_members")
        .update({ role: newRole as any })
        .eq("id", membershipId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Role updated successfully",
      });

      fetchUserDetails();
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    }
  };

  const availableFamilies = families.filter(
    f => !memberships.some(m => m.family_id === f.id)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">User not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/users")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">User Details</h1>
            <p className="text-muted-foreground">Manage user profile and family memberships</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={user.full_name}
                onChange={(e) => setUser({ ...user, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={user.phone || ""}
                onChange={(e) => setUser({ ...user, phone: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_working"
                checked={user.is_working || false}
                onChange={(e) => setUser({ ...user, is_working: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is_working">Currently Working</Label>
            </div>
            <Button onClick={handleSaveProfile} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Family Memberships</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {memberships.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Not a member of any family</p>
            ) : (
              <div className="space-y-3">
                {memberships.map((membership) => (
                  <div key={membership.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{membership.family.name}</p>
                      <Select
                        value={membership.role}
                        onValueChange={(value) => handleUpdateRole(membership.id, value)}
                      >
                        <SelectTrigger className="w-48 mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="treasurer">Treasurer</SelectItem>
                          <SelectItem value="loan_committee">Loan Committee</SelectItem>
                          <SelectItem value="family_head">Family Head</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove from Family</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove this user from {membership.family.name}?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRemoveMembership(membership.id)}>
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}

            {availableFamilies.length > 0 && (
              <div className="pt-4 border-t space-y-3">
                <h4 className="font-medium">Add to Family</h4>
                <div className="flex gap-2">
                  <Select
                    value={newMembership.family_id}
                    onValueChange={(value) => setNewMembership({ ...newMembership, family_id: value })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a family" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFamilies.map((family) => (
                        <SelectItem key={family.id} value={family.id}>
                          {family.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={newMembership.role}
                    onValueChange={(value) => setNewMembership({ ...newMembership, role: value })}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="treasurer">Treasurer</SelectItem>
                      <SelectItem value="loan_committee">Loan Committee</SelectItem>
                      <SelectItem value="family_head">Family Head</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddMembership}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

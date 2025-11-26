import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Search, UserPlus, Edit, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_working: boolean | null;
  created_at: string;
}

interface FamilyMembership {
  family_id: string;
  role: string;
  family: {
    name: string;
    slug: string;
  };
}

interface UserWithFamilies extends UserProfile {
  families: FamilyMembership[];
  is_super_admin: boolean;
}

export default function Users() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserWithFamilies[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [families, setFamilies] = useState<any[]>([]);
  
  // New user form state
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    family_id: "",
    role: "member" as const,
  });

  useEffect(() => {
    checkSuperAdmin();
    fetchUsers();
    fetchFamilies();
  }, []);

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

  const fetchUsers = async () => {
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");

      if (profilesError) throw profilesError;

      // Fetch family memberships for all users
      const { data: memberships, error: membershipsError } = await supabase
        .from("family_members")
        .select(`
          user_id,
          family_id,
          role,
          families:family_id (
            name,
            slug
          )
        `);

      if (membershipsError) throw membershipsError;

      // Fetch super admins
      const { data: superAdmins, error: superAdminsError } = await supabase
        .from("super_admins")
        .select("user_id");

      if (superAdminsError) throw superAdminsError;

      const superAdminIds = new Set(superAdmins?.map(sa => sa.user_id) || []);

      // Combine data
      const usersWithFamilies: UserWithFamilies[] = (profiles || []).map(profile => ({
        ...profile,
        families: (memberships || [])
          .filter(m => m.user_id === profile.id)
          .map(m => ({
            family_id: m.family_id,
            role: m.role,
            family: m.families as any,
          })),
        is_super_admin: superAdminIds.has(profile.id),
      }));

      setUsers(usersWithFamilies);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      toast({
        title: "Validation Error",
        description: "Email, password, and full name are required",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.full_name,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Update profile with phone
        if (newUser.phone) {
          await supabase
            .from("profiles")
            .update({ phone: newUser.phone })
            .eq("id", authData.user.id);
        }

        // Add to family if selected
        if (newUser.family_id) {
          await supabase
            .from("family_members")
            .insert({
              user_id: authData.user.id,
              family_id: newUser.family_id,
              role: newUser.role,
            });
        }

        toast({
          title: "Success",
          description: "User created successfully",
        });

        setIsAddUserOpen(false);
        setNewUser({
          email: "",
          password: "",
          full_name: "",
          phone: "",
          family_id: "",
          role: "member",
        });
        fetchUsers();
      }
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{t('common.userManagement')}</h1>
              <p className="text-muted-foreground">Manage all users across the system</p>
            </div>
          </div>

          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={newUser.full_name}
                    onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    placeholder="+1234567890"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="family">Assign to Family (Optional)</Label>
                  <Select
                    value={newUser.family_id}
                    onValueChange={(value) => setNewUser({ ...newUser, family_id: value })}
                  >
                    <SelectTrigger id="family">
                      <SelectValue placeholder="Select a family" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Family</SelectItem>
                      {families.map((family) => (
                        <SelectItem key={family.id} value={family.id}>
                          {family.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {newUser.family_id && (
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={newUser.role}
                      onValueChange={(value: any) => setNewUser({ ...newUser, role: value })}
                    >
                      <SelectTrigger id="role">
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
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateUser}>
                  Create User
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Badge variant="secondary">
                {filteredUsers.length} {filteredUsers.length === 1 ? "user" : "users"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No users found</div>
            ) : (
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <Card key={user.id} className="hover:bg-accent/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{user.full_name}</h3>
                            {user.is_super_admin && (
                              <Badge variant="destructive">Super Admin</Badge>
                            )}
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p>{user.email}</p>
                            {user.phone && <p>{user.phone}</p>}
                            <div className="flex flex-wrap gap-2 mt-2">
                              {user.families.length === 0 ? (
                                <Badge variant="outline">No family assigned</Badge>
                              ) : (
                                user.families.map((fm) => (
                                  <Badge key={fm.family_id} variant="secondary">
                                    {fm.family.name} - {fm.role.replace("_", " ")}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/admin/users/${user.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

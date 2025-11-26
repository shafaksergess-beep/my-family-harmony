import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
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
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [families, setFamilies] = useState<any[]>([]);
  const [bulkImportData, setBulkImportData] = useState("");
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  
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

  const handleBulkImport = async () => {
    try {
      const lines = bulkImportData.trim().split("\n");
      const results = { success: 0, failed: 0, errors: [] as string[] };

      // Skip header row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const [email, password, full_name, phone, family_name, role] = line
          .split(",")
          .map((s) => s.trim().replace(/^"|"$/g, ""));

        try {
          // Find family by name if provided
          let familyId = "";
          if (family_name) {
            const family = families.find((f) => f.name === family_name);
            if (family) {
              familyId = family.id;
            } else {
              throw new Error(`Family "${family_name}" not found`);
            }
          }

          // Create user
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name,
              },
            },
          });

          if (authError) throw authError;

          if (authData.user) {
            // Update profile with phone
            if (phone) {
              await supabase
                .from("profiles")
                .update({ phone })
                .eq("id", authData.user.id);
            }

            // Add to family if provided
            if (familyId) {
              await supabase.from("family_members").insert([{
                user_id: authData.user.id,
                family_id: familyId,
                role: (role || "member") as Database["public"]["Enums"]["user_role"],
              }]);
            }

            results.success++;
          }
        } catch (error: any) {
          results.failed++;
          results.errors.push(
            `Row ${i}: ${email} - ${error.message || "Unknown error"}`
          );
        }
      }

      setImportResults(results);
      
      if (results.success > 0) {
        toast({
          title: "Import Complete",
          description: `Successfully imported ${results.success} users. ${results.failed} failed.`,
        });
        fetchUsers();
      } else {
        toast({
          title: "Import Failed",
          description: "No users were imported successfully",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error importing users:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to import users",
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

          <div className="flex gap-2">
            <Dialog open={isBulkImportOpen} onOpenChange={setIsBulkImportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Bulk Import
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Bulk Import Users</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>CSV Format (paste data below)</Label>
                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded font-mono">
                      email,password,full_name,phone,family_name,role
                      <br />
                      user1@example.com,password123,John Doe,+1234567890,Smith Family,member
                      <br />
                      user2@example.com,password456,Jane Smith,,Jones Family,treasurer
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bulk_data">CSV Data</Label>
                    <textarea
                      id="bulk_data"
                      value={bulkImportData}
                      onChange={(e) => setBulkImportData(e.target.value)}
                      placeholder="Paste CSV data here..."
                      className="w-full h-64 p-2 border rounded font-mono text-sm"
                    />
                  </div>
                  {importResults && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-4">
                        <Badge className="bg-green-500">
                          {importResults.success} Successful
                        </Badge>
                        <Badge className="bg-red-500">
                          {importResults.failed} Failed
                        </Badge>
                      </div>
                      {importResults.errors.length > 0 && (
                        <div className="text-xs text-red-500 space-y-1 max-h-32 overflow-y-auto">
                          {importResults.errors.map((error, idx) => (
                            <div key={idx}>{error}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsBulkImportOpen(false);
                      setBulkImportData("");
                      setImportResults(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleBulkImport}>Import Users</Button>
                </div>
              </DialogContent>
            </Dialog>

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

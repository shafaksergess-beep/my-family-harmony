import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Database } from "@/integrations/supabase/types";

interface Permission {
  id: string;
  module: string;
  action: string;
  description: string;
}

interface RolePermission {
  id: string;
  role: string;
  permission_id: string;
  family_id: string | null;
}

export default function RolePermissions() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const roles = [
    { value: "family_head", label: "Family Head", color: "bg-purple-500" },
    { value: "treasurer", label: "Treasurer", color: "bg-blue-500" },
    { value: "loan_committee", label: "Loan Committee", color: "bg-green-500" },
    { value: "member", label: "Member", color: "bg-gray-500" },
    { value: "guest", label: "Guest", color: "bg-slate-400" },
  ];

  useEffect(() => {
    checkSuperAdmin();
    fetchData();
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
      navigate("/admin");
    }
  };

  const fetchData = async () => {
    try {
      const [permissionsRes, rolePermissionsRes] = await Promise.all([
        supabase.from("permissions").select("*").order("module, action"),
        supabase.from("role_permissions").select("*").is("family_id", null),
      ]);

      if (permissionsRes.error) throw permissionsRes.error;
      if (rolePermissionsRes.error) throw rolePermissionsRes.error;

      setPermissions(permissionsRes.data || []);
      setRolePermissions(rolePermissionsRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load permissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (role: string, permissionId: string) => {
    return rolePermissions.some(
      (rp) => rp.role === role && rp.permission_id === permissionId
    );
  };

  const togglePermission = async (role: string, permissionId: string) => {
    const exists = hasPermission(role, permissionId);

    if (exists) {
      // Remove permission
      setRolePermissions((prev) =>
        prev.filter(
          (rp) => !(rp.role === role && rp.permission_id === permissionId)
        )
      );
    } else {
      // Add permission
      setRolePermissions((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role,
          permission_id: permissionId,
          family_id: null,
        },
      ]);
    }
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      // Delete all existing role permissions (for global/default)
      await supabase.from("role_permissions").delete().is("family_id", null);

      // Insert new role permissions
      const inserts = rolePermissions.map((rp) => ({
        role: rp.role as Database["public"]["Enums"]["user_role"],
        permission_id: rp.permission_id,
        family_id: null,
      }));

      const { error } = await supabase.from("role_permissions").insert(inserts);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Role permissions updated successfully",
      });
    } catch (error) {
      console.error("Error saving permissions:", error);
      toast({
        title: "Error",
        description: "Failed to save permissions",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Group permissions by module
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

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
              <h1 className="text-3xl font-bold">Role Permissions</h1>
              <p className="text-muted-foreground">
                Customize what each role can access and modify
              </p>
            </div>
          </div>

          <Button onClick={saveChanges} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* Legend */}
        <Card>
          <CardHeader>
            <CardTitle>Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {roles.map((role) => (
                <Badge key={role.value} className={role.color}>
                  {role.label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading permissions...
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedPermissions).map(([module, perms]) => (
              <Card key={module}>
                <CardHeader>
                  <CardTitle className="capitalize">{module}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium">Action</th>
                          <th className="text-left p-2 font-medium">
                            Description
                          </th>
                          {roles.map((role) => (
                            <th key={role.value} className="text-center p-2">
                              <Badge className={role.color} variant="outline">
                                {role.label}
                              </Badge>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {perms.map((perm) => (
                          <tr key={perm.id} className="border-b">
                            <td className="p-2 font-medium capitalize">
                              {perm.action}
                            </td>
                            <td className="p-2 text-sm text-muted-foreground">
                              {perm.description}
                            </td>
                            {roles.map((role) => (
                              <td key={role.value} className="text-center p-2">
                                <Switch
                                  checked={hasPermission(role.value, perm.id)}
                                  onCheckedChange={() =>
                                    togglePermission(role.value, perm.id)
                                  }
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

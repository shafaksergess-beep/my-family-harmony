import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Shield, Users, Loader2 } from "lucide-react";

interface MemberWithRoles {
  id: string;
  role: string;
  user_id: string;
  profiles: {
    full_name: string;
    email: string;
  };
  assignedRoles: string[];
}

const ROLE_INFO: Record<string, { label: string; description: string; color: string }> = {
  family_head: {
    label: "Family Head",
    description: "Full administrative control over the family",
    color: "bg-purple-500",
  },
  family_admin: {
    label: "Family Admin",
    description: "All admin rights for this specific family",
    color: "bg-blue-500",
  },
  secretary: {
    label: "Secretary",
    description: "Can manage minutes, reports, and member communications",
    color: "bg-green-500",
  },
  treasurer: {
    label: "Treasurer",
    description: "Manages financial records and transactions",
    color: "bg-yellow-500",
  },
  loan_committee: {
    label: "Loan Committee",
    description: "Reviews and approves loan requests",
    color: "bg-orange-500",
  },
  member: {
    label: "Member",
    description: "Standard family member access",
    color: "bg-gray-500",
  },
  guest: {
    label: "Guest",
    description: "Limited read-only access",
    color: "bg-slate-500",
  },
};

export default function RoleManagement() {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canManageMembers, family, isLoading: authLoading, isFamilyHead, isFamilyAdmin } = useFamilyAuth(familySlug);
  const [members, setMembers] = useState<MemberWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !canManageMembers) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to manage roles",
        variant: "destructive",
      });
      navigate(`/family/${familySlug}`);
      return;
    }

    if (family) {
      fetchMembers();
    }
  }, [family, authLoading, canManageMembers]);

  const fetchMembers = async () => {
    try {
      // Fetch members with profiles
      const { data: memberData, error: memberError } = await supabase
        .from("family_members")
        .select(`id, role, user_id, profiles (full_name, email)`)
        .eq("family_id", family.id)
        .order("role");

      if (memberError) throw memberError;

      // Fetch all member_roles for this family's members
      const memberIds = (memberData || []).map((m: any) => m.id);
      const { data: rolesData, error: rolesError } = await supabase
        .from("member_roles")
        .select("member_id, role")
        .in("member_id", memberIds);

      if (rolesError) throw rolesError;

      // Group roles by member
      const rolesByMember: Record<string, string[]> = {};
      (rolesData || []).forEach((r: any) => {
        if (!rolesByMember[r.member_id]) rolesByMember[r.member_id] = [];
        rolesByMember[r.member_id].push(r.role);
      });

      const enriched: MemberWithRoles[] = (memberData || []).map((m: any) => ({
        ...m,
        assignedRoles: rolesByMember[m.id] || [m.role],
      }));

      setMembers(enriched);
    } catch (error) {
      console.error("Error fetching members:", error);
      toast({ title: "Error", description: "Failed to load family members", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = async (memberId: string, role: string, currentRoles: string[]) => {
    setUpdating(memberId);
    try {
      const hasRole = currentRoles.includes(role);

      if (hasRole) {
        // Don't allow removing the last role
        if (currentRoles.length <= 1) {
          toast({ title: "Cannot remove", description: "A member must have at least one role", variant: "destructive" });
          setUpdating(null);
          return;
        }
        // Remove role
        const { error } = await supabase
          .from("member_roles")
          .delete()
          .eq("member_id", memberId)
          .eq("role", role as any);
        if (error) throw error;

        // Update primary role in family_members if needed
        const remaining = currentRoles.filter(r => r !== role);
        const primaryRole = remaining.includes("family_head") ? "family_head" :
          remaining.includes("family_admin") ? "family_admin" : remaining[0];
        await supabase.from("family_members").update({ role: primaryRole as any }).eq("id", memberId);
      } else {
        // Add role
        const { error } = await supabase
          .from("member_roles")
          .insert({ member_id: memberId, role: role as any, assigned_by: (await supabase.auth.getUser()).data.user?.id });
        if (error) throw error;

        // If adding family_head or family_admin, update primary role
        if (role === "family_head" || role === "family_admin") {
          await supabase.from("family_members").update({ role: role as any }).eq("id", memberId);
        }
      }

      toast({ title: "Success", description: hasRole ? "Role removed" : "Role assigned" });
      fetchMembers();
    } catch (error: any) {
      console.error("Error toggling role:", error);
      toast({ title: "Error", description: error.message || "Failed to update role", variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(`/family/${familySlug}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Role Management
          </h1>
          <p className="text-muted-foreground">
            Assign multiple roles to family members
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Available Roles
          </CardTitle>
          <CardDescription>Each role grants specific permissions. Members can hold multiple roles.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(ROLE_INFO).map(([key, info]) => (
              <div key={key} className="flex items-start gap-3 p-3 rounded-lg border">
                <div className={`w-3 h-3 rounded-full ${info.color} mt-1.5`}></div>
                <div>
                  <h4 className="font-semibold">{info.label}</h4>
                  <p className="text-sm text-muted-foreground">{info.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Family Members</CardTitle>
          <CardDescription>Check/uncheck roles for each member. A member must have at least one role.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {members.map((member) => (
              <div key={member.id} className="p-4 rounded-lg border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{member.profiles.full_name}</div>
                    <div className="text-sm text-muted-foreground">{member.profiles.email}</div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {member.assignedRoles.map((r) => (
                      <Badge key={r} className={ROLE_INFO[r]?.color}>
                        {ROLE_INFO[r]?.label || r}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {Object.entries(ROLE_INFO).map(([key, info]) => {
                    const isChecked = member.assignedRoles.includes(key);
                    const isDisabled = updating === member.id;
                    return (
                      <label
                        key={key}
                        className={`flex items-center gap-2 p-2 rounded border text-sm cursor-pointer hover:bg-muted/50 ${isChecked ? "border-primary bg-primary/5" : ""} ${isDisabled ? "opacity-50 pointer-events-none" : ""}`}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleRole(member.id, key, member.assignedRoles)}
                          disabled={isDisabled}
                        />
                        <span>{info.label}</span>
                        {updating === member.id && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

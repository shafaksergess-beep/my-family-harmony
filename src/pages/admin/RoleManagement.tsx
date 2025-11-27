import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Shield, Users } from "lucide-react";

interface FamilyMember {
  id: string;
  role: string;
  user_id: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

const ROLE_INFO = {
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
  const { canManageMembers, family, isLoading: authLoading } = useFamilyAuth(familySlug);
  const [members, setMembers] = useState<FamilyMember[]>([]);
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
      const { data, error } = await supabase
        .from("family_members")
        .select(`
          id,
          role,
          user_id,
          profiles (
            full_name,
            email
          )
        `)
        .eq("family_id", family.id)
        .order("role");

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error("Error fetching members:", error);
      toast({
        title: "Error",
        description: "Failed to load family members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (memberId: string, newRole: string) => {
    setUpdating(memberId);
    try {
      const { error } = await supabase
        .from("family_members")
        .update({ role: newRole as any })
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Member role updated successfully",
      });

      fetchMembers();
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: "Error",
        description: "Failed to update member role",
        variant: "destructive",
      });
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(`/family/${familySlug}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Role Management
            </h1>
            <p className="text-muted-foreground">
              Assign and manage roles for family members
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Available Roles
            </CardTitle>
            <CardDescription>
              Each role has specific permissions and responsibilities
            </CardDescription>
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
            <CardDescription>
              Update roles for members in your family
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{member.profiles.full_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {member.profiles.email}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={ROLE_INFO[member.role as keyof typeof ROLE_INFO]?.color}>
                      {ROLE_INFO[member.role as keyof typeof ROLE_INFO]?.label || member.role}
                    </Badge>
                    <Select
                      value={member.role}
                      onValueChange={(value: string) => updateRole(member.id, value)}
                      disabled={updating === member.id}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLE_INFO).map(([key, info]) => (
                          <SelectItem key={key} value={key}>
                            {info.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

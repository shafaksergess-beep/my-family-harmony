import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface FamilyAuthData {
  family: any;
  userRoles: string[];
  userId: string;
  isLoading: boolean;
  canManageFinances: boolean;
  canManageLoans: boolean;
  canManageMembers: boolean;
  isFamilyHead: boolean;
  isTreasurer: boolean;
}

export const useFamilyAuth = (familySlug?: string) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [family, setFamily] = useState<any>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [memberId, setMemberId] = useState<string>("");

  useEffect(() => {
    checkAuth();
  }, [familySlug]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUserId(session.user.id);

      if (familySlug) {
        const { data: familyData, error: familyError } = await supabase
          .from("families")
          .select("*")
          .eq("slug", familySlug)
          .single();
        
        if (familyError || !familyData) {
          toast({
            title: "Error",
            description: "Family not found",
            variant: "destructive",
          });
          navigate("/dashboard");
          return;
        }
        
        setFamily(familyData);

        // Get user's membership in this family
        const { data: memberData } = await supabase
          .from("family_members")
          .select("id, role")
          .eq("family_id", familyData.id)
          .eq("user_id", session.user.id)
          .single();
        
        if (!memberData) {
          toast({
            title: "Access Denied",
            description: "You are not a member of this family",
            variant: "destructive",
          });
          navigate("/dashboard");
          return;
        }

        setMemberId(memberData.id);

        // Get all roles for this member from member_roles table
        const { data: rolesData } = await supabase
          .from("member_roles")
          .select("role")
          .eq("member_id", memberData.id);

        const roles = rolesData?.map(r => r.role) || [memberData.role];
        setUserRoles(roles);
      }
    } catch (error) {
      console.error("Auth check error:", error);
      toast({
        title: "Error",
        description: "Authentication failed",
        variant: "destructive",
      });
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  // Helper to check if user has a specific role
  const hasRole = (role: string) => userRoles.includes(role);
  const hasAnyRole = (roles: string[]) => roles.some(r => userRoles.includes(r));

  // Permission helpers (now check against array of roles)
  const isFamilyHead = hasRole("family_head");
  const isFamilyAdmin = hasRole("family_admin");
  const isTreasurer = hasRole("treasurer");
  const isLoanCommittee = hasRole("loan_committee");
  const isSecretary = hasRole("secretary");
  
  const canManageFinances = hasAnyRole(["family_head", "family_admin", "treasurer"]);
  const canManageLoans = hasAnyRole(["family_head", "family_admin", "loan_committee"]);
  const canManageMembers = hasAnyRole(["family_head", "family_admin"]);
  const canManageReports = hasAnyRole(["family_head", "family_admin", "secretary"]);
  const canManageMinutes = hasAnyRole(["family_head", "family_admin", "secretary"]);
  const canScheduleMeetings = hasAnyRole(["family_head", "family_admin", "treasurer", "secretary"]);

  return {
    family,
    userRoles,
    userRole: userRoles[0] || "", // Backward compatibility - primary role
    userId,
    memberId,
    isLoading: loading,
    hasRole,
    hasAnyRole,
    canManageFinances,
    canManageLoans,
    canManageMembers,
    canManageReports,
    canManageMinutes,
    canScheduleMeetings,
    isFamilyHead,
    isFamilyAdmin,
    isTreasurer,
    isSecretary,
    isLoanCommittee,
  };
};

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface FamilyAuthData {
  family: any;
  userRole: string;
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
  const [userRole, setUserRole] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

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

        // Get user's role in this family
        const { data: memberData } = await supabase
          .from("family_members")
          .select("role")
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

        setUserRole(memberData.role);
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

  // Permission helpers
  const isFamilyHead = userRole === "family_head";
  const isFamilyAdmin = userRole === "family_admin";
  const isTreasurer = userRole === "treasurer";
  const isLoanCommittee = userRole === "loan_committee";
  const isSecretary = userRole === "secretary";
  
  const canManageFinances = isFamilyHead || isFamilyAdmin || isTreasurer;
  const canManageLoans = isFamilyHead || isFamilyAdmin || isLoanCommittee;
  const canManageMembers = isFamilyHead || isFamilyAdmin;
  const canManageReports = isFamilyHead || isFamilyAdmin || isSecretary;
  const canManageMinutes = isFamilyHead || isFamilyAdmin || isSecretary;

  return {
    family,
    userRole,
    userId,
    isLoading: loading,
    canManageFinances,
    canManageLoans,
    canManageMembers,
    canManageReports,
    canManageMinutes,
    isFamilyHead,
    isFamilyAdmin,
    isTreasurer,
    isSecretary,
  };
};

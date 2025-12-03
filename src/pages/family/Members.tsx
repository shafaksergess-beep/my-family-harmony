import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Search, User, Phone, Mail, Download, UserCog } from "lucide-react";
import { exportMembersToCSV } from "@/lib/export";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileMembers } from "@/components/mobile";

interface Member {
  id: string;
  user_id: string;
  role: string;
  house_name: string | null;
  is_house_representative: boolean;
  profiles: {
    full_name: string;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    is_working: boolean;
  };
}

const Members = () => {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canManageMembers } = useFamilyAuth(familySlug);
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [familyId, setFamilyId] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [newRole, setNewRole] = useState<"family_head" | "treasurer" | "loan_committee" | "member" | "guest">("member");
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);

  useEffect(() => {
    loadMembers();
  }, [familySlug]);

  useEffect(() => {
    filterMembers();
  }, [searchQuery, members]);

  const loadMembers = async () => {
    try {
      setLoading(true);

      const { data: family, error: familyError } = await supabase
        .from("families")
        .select("id, name")
        .eq("slug", familySlug)
        .single();

      if (familyError || !family) {
        toast({
          title: "Error",
          description: "Family not found",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setFamilyName(family.name);
      setFamilyId(family.id);

      // Fetch family members
      const { data: membersData, error: membersError } = await supabase
        .from("family_members")
        .select("id, user_id, role, house_name, is_house_representative")
        .eq("family_id", family.id)
        .order("role");

      if (membersError) throw membersError;

      // Fetch profiles separately
      const userIds = membersData?.map(m => m.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, avatar_url, is_working")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Merge data
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const mergedData = membersData?.map(member => ({
        ...member,
        profiles: profilesMap.get(member.user_id) || {
          full_name: "Unknown",
          email: null,
          phone: null,
          avatar_url: null,
          is_working: false,
        },
      })) || [];

      setMembers(mergedData as any);
      setFilteredMembers(mergedData as any);
    } catch (error: any) {
      console.error("Error loading members:", error);
      toast({
        title: "Error",
        description: "Failed to load members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterMembers = () => {
    if (!searchQuery.trim()) {
      setFilteredMembers(members);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = members.filter(
      (member) =>
        member.profiles.full_name.toLowerCase().includes(query) ||
        member.role.toLowerCase().includes(query) ||
        member.house_name?.toLowerCase().includes(query) ||
        member.profiles.email?.toLowerCase().includes(query)
    );
    setFilteredMembers(filtered);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "family_head":
        return "default";
      case "treasurer":
        return "secondary";
      case "loan_committee":
        return "outline";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (role: string) => {
    return role
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleRoleChange = async () => {
    if (!selectedMember || !newRole) return;

    try {
      const { error } = await supabase
        .from("family_members")
        .update({ role: newRole })
        .eq("id", selectedMember.id);

      if (error) throw error;

      toast({
        title: "Role Updated",
        description: `${selectedMember.profiles.full_name} is now a ${getRoleLabel(newRole)}`,
      });

      setIsRoleDialogOpen(false);
      setSelectedMember(null);
      setNewRole("member");
      loadMembers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openRoleDialog = (member: Member) => {
    setSelectedMember(member);
    setNewRole(member.role as any);
    setIsRoleDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Render mobile version
  if (isMobile) {
    return <MobileMembers />;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/family/${familySlug}`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{familyName} Members</h1>
              <p className="text-muted-foreground">
                {filteredMembers.length} member{filteredMembers.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => exportMembersToCSV(filteredMembers)}
              disabled={filteredMembers.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search members by name, role, house, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => (
            <Card key={member.id} className="p-6 hover:shadow-lg transition-shadow relative group">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={member.profiles.avatar_url || undefined} />
                      <AvatarFallback>
                        <User className="h-8 w-8" />
                      </AvatarFallback>
                    </Avatar>
                    {member.is_house_representative && (
                      <Badge variant="secondary">House Rep</Badge>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg">
                      {member.profiles.full_name}
                    </h3>
                    <Badge variant={getRoleBadgeVariant(member.role)} className="mt-1">
                      {getRoleLabel(member.role)}
                    </Badge>
                  </div>

                <Link to={`/family/${familySlug}/members/${member.id}`}>
                  {member.house_name && (
                    <p className="text-sm text-muted-foreground hover:underline">
                      House: {member.house_name}
                    </p>
                  )}

                  <div className="space-y-2 text-sm">
                    {member.profiles.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{member.profiles.email}</span>
                      </div>
                    )}
                    {member.profiles.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{member.profiles.phone}</span>
                      </div>
                    )}
                  </div>

                  {member.profiles.is_working && (
                    <Badge variant="outline" className="text-xs">
                      Working Member
                    </Badge>
                  )}
                </Link>
              </div>
            </Card>
          ))}
        </div>

        {filteredMembers.length === 0 && (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No members found matching your search.</p>
            </div>
          </Card>
        )}
      </div>

      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded">
                <p className="font-medium">{selectedMember.profiles.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  Current Role: {getRoleLabel(selectedMember.role)}
                </p>
              </div>
              <div>
                <Label>New Role</Label>
                <Select value={newRole} onValueChange={(value) => setNewRole(value as typeof newRole)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="family_head">Family Head</SelectItem>
                    <SelectItem value="treasurer">Treasurer</SelectItem>
                    <SelectItem value="loan_committee">Loan Committee</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="guest">Guest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleRoleChange} className="w-full">
                Update Role
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Members;

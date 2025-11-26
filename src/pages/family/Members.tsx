import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Search, User, Phone, Mail } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [familyName, setFamilyName] = useState("");

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

      const { data: membersData, error: membersError } = await supabase
        .from("family_members")
        .select(`
          id,
          user_id,
          role,
          house_name,
          is_house_representative,
          profiles!inner(
            full_name,
            email,
            phone,
            avatar_url,
            is_working
          )
        `)
        .eq("family_id", family.id)
        .order("role");

      if (membersError) throw membersError;

      setMembers(membersData as any);
      setFilteredMembers(membersData as any);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
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
            <Link
              key={member.id}
              to={`/family/${familySlug}/members/${member.id}`}
            >
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
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

                  {member.house_name && (
                    <p className="text-sm text-muted-foreground">
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
                </div>
              </Card>
            </Link>
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
    </div>
  );
};

export default Members;

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { haptics } from "@/lib/haptics";
import { OfflineIndicator } from "./OfflineIndicator";
import { MemberCard } from "./MemberCard";
import { FamilyStatsCard } from "./FamilyStatsCard";
import {
  ArrowLeft,
  Search,
  Users,
  UserPlus,
  Filter,
  RefreshCw,
  Crown,
  Shield,
  Wallet,
  User,
  Info,
  Settings,
  BookOpen,
} from "lucide-react";
import { format } from "date-fns";

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

export function MobileMembers() {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { family, canManageMembers, isFamilyHead, isLoading: authLoading } = useFamilyAuth(familySlug);

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [activeTab, setActiveTab] = useState("members");

  // Sheets
  const [showInviteSheet, setShowInviteSheet] = useState(false);
  const [showRoleSheet, setShowRoleSheet] = useState(false);
  const [showInfoSheet, setShowInfoSheet] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [newRole, setNewRole] = useState("");

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [sending, setSending] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalMembers: 0,
    workingMembers: 0,
    totalHouses: 0,
    totalContributions: 0,
    totalLoansActive: 0,
    totalSavings: 0,
    nextMeetingDate: "",
  });

  useEffect(() => {
    if (family?.id) {
      loadMembers();
      loadStats();
    }
  }, [family?.id]);

  const loadMembers = async () => {
    try {
      const { data: membersData, error: membersError } = await supabase
        .from("family_members")
        .select("id, user_id, role, house_name, is_house_representative")
        .eq("family_id", family!.id)
        .order("role");

      if (membersError) throw membersError;

      const userIds = membersData?.map((m) => m.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, avatar_url, is_working")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map(profilesData?.map((p) => [p.id, p]) || []);
      const mergedData = membersData?.map((member) => ({
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
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Get contributions total
      const { data: contributions } = await supabase
        .from("contributions")
        .select("amount")
        .eq("family_id", family!.id)
        .eq("status", "paid");

      // Get active loans
      const { data: loans } = await supabase
        .from("loans")
        .select("amount")
        .eq("family_id", family!.id)
        .eq("status", "disbursed");

      // Get next meeting
      const { data: meeting } = await supabase
        .from("meetings")
        .select("meeting_date")
        .eq("family_id", family!.id)
        .gte("meeting_date", new Date().toISOString().split("T")[0])
        .order("meeting_date")
        .limit(1)
        .single();

      const houses = new Set(members.filter((m) => m.house_name).map((m) => m.house_name));

      setStats({
        totalMembers: members.length,
        workingMembers: members.filter((m) => m.profiles.is_working).length,
        totalHouses: houses.size,
        totalContributions: contributions?.reduce((sum, c) => sum + c.amount, 0) || 0,
        totalLoansActive: loans?.reduce((sum, l) => sum + l.amount, 0) || 0,
        totalSavings: 0, // Would need savings table query
        nextMeetingDate: meeting?.meeting_date
          ? format(new Date(meeting.meeting_date), "MMM dd, yyyy")
          : "",
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    haptics.light();
    await loadMembers();
    await loadStats();
    setRefreshing(false);
    haptics.success();
  };

  const handleInvite = async () => {
    if (!inviteEmail || !family) return;
    setSending(true);
    haptics.light();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error: inviteError } = await supabase.from("invitations").insert({
        email: inviteEmail,
        family_id: family.id,
        role: inviteRole as "family_admin" | "family_head" | "guest" | "loan_committee" | "member" | "secretary" | "treasurer",
        invited_by: user.id,
        token,
        expires_at: expiresAt.toISOString(),
      });

      if (inviteError) throw inviteError;

      // Send invitation email
      await supabase.functions.invoke("send-invitation", {
        body: {
          email: inviteEmail,
          familyName: family.name,
          token,
          role: inviteRole,
        },
      });

      toast({ title: "Invitation Sent", description: `Invitation sent to ${inviteEmail}` });
      haptics.success();
      setShowInviteSheet(false);
      setInviteEmail("");
      setInviteRole("member");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      haptics.error();
    } finally {
      setSending(false);
    }
  };

  const handleRoleChange = async () => {
    if (!selectedMember || !newRole) return;
    haptics.light();

    try {
      const { error } = await supabase
        .from("family_members")
        .update({ role: newRole as "family_admin" | "family_head" | "guest" | "loan_committee" | "member" | "secretary" | "treasurer" })
        .eq("id", selectedMember.id);

      if (error) throw error;

      toast({
        title: "Role Updated",
        description: `${selectedMember.profiles.full_name}'s role has been updated`,
      });
      haptics.success();
      setShowRoleSheet(false);
      setSelectedMember(null);
      loadMembers();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      haptics.error();
    }
  };

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      !searchQuery ||
      member.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.profiles.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.house_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = filterRole === "all" || member.role === filterRole;

    return matchesSearch && matchesRole;
  });

  const roleGroups = {
    leadership: filteredMembers.filter((m) =>
      ["family_head", "family_admin", "treasurer", "secretary"].includes(m.role)
    ),
    committee: filteredMembers.filter((m) => m.role === "loan_committee"),
    members: filteredMembers.filter((m) => m.role === "member"),
    guests: filteredMembers.filter((m) => m.role === "guest"),
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <OfflineIndicator />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                haptics.light();
                navigate(`/family/${familySlug}`);
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Family Members</h1>
              <p className="text-xs text-muted-foreground">{members.length} members</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            {isFamilyHead && (
              <Button
                size="sm"
                onClick={() => {
                  haptics.light();
                  setShowInviteSheet(true);
                }}
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Invite
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-[120px]">
              <Filter className="h-4 w-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="family_head">Head</SelectItem>
              <SelectItem value="family_admin">Admin</SelectItem>
              <SelectItem value="treasurer">Treasurer</SelectItem>
              <SelectItem value="loan_committee">Committee</SelectItem>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="guest">Guest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4 pt-4">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="members" className="text-xs">
            <Users className="h-4 w-4 mr-1" />
            Members
          </TabsTrigger>
          <TabsTrigger value="stats" className="text-xs">
            <Info className="h-4 w-4 mr-1" />
            Stats
          </TabsTrigger>
          <TabsTrigger value="info" className="text-xs">
            <BookOpen className="h-4 w-4 mr-1" />
            Heritage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4 mt-4">
          {/* Leadership */}
          {roleGroups.leadership.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Crown className="h-4 w-4" />
                Leadership ({roleGroups.leadership.length})
              </div>
              {roleGroups.leadership.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  onClick={() => {
                    haptics.light();
                    if (canManageMembers) {
                      setSelectedMember(member);
                      setNewRole(member.role);
                      setShowRoleSheet(true);
                    } else {
                      navigate(`/family/${familySlug}/members/${member.id}`);
                    }
                  }}
                />
              ))}
            </div>
          )}

          {/* Committee */}
          {roleGroups.committee.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Shield className="h-4 w-4" />
                Loan Committee ({roleGroups.committee.length})
              </div>
              {roleGroups.committee.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  onClick={() => {
                    haptics.light();
                    if (canManageMembers) {
                      setSelectedMember(member);
                      setNewRole(member.role);
                      setShowRoleSheet(true);
                    } else {
                      navigate(`/family/${familySlug}/members/${member.id}`);
                    }
                  }}
                />
              ))}
            </div>
          )}

          {/* Members */}
          {roleGroups.members.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />
                Members ({roleGroups.members.length})
              </div>
              {roleGroups.members.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  onClick={() => {
                    haptics.light();
                    if (canManageMembers) {
                      setSelectedMember(member);
                      setNewRole(member.role);
                      setShowRoleSheet(true);
                    } else {
                      navigate(`/family/${familySlug}/members/${member.id}`);
                    }
                  }}
                />
              ))}
            </div>
          )}

          {/* Guests */}
          {roleGroups.guests.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />
                Guests ({roleGroups.guests.length})
              </div>
              {roleGroups.guests.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  showContact={false}
                  onClick={() => {
                    haptics.light();
                    if (canManageMembers) {
                      setSelectedMember(member);
                      setNewRole(member.role);
                      setShowRoleSheet(true);
                    }
                  }}
                />
              ))}
            </div>
          )}

          {filteredMembers.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No members found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          <FamilyStatsCard stats={stats} familyName={family?.name || ""} />

          {/* Quick Settings Links */}
          {isFamilyHead && (
            <div className="mt-4 space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate(`/family/${familySlug}/invitations`)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Manage Invitations
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate(`/family/${familySlug}/financial-settings`)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Family Settings
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="info" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Heritage & Culture
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {family?.heritage_info || "No heritage information has been added yet."}
                </p>
              </div>

              {family?.description && (
                <div>
                  <h4 className="font-medium">About</h4>
                  <p className="text-sm text-muted-foreground mt-1">{family.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Meeting Day</div>
                  <div className="font-medium capitalize">
                    {family?.meeting_day?.replace("_", " ") || "Last Saturday"}
                  </div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Meeting Time</div>
                  <div className="font-medium">{family?.meeting_time || "13:00"}</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Contribution</div>
                  <div className="font-medium">
                    {family?.mandatory_contribution?.toLocaleString() || "25,000"} FCFA
                  </div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Language</div>
                  <div className="font-medium capitalize">
                    {family?.primary_language || "English"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite Sheet */}
      <Sheet open={showInviteSheet} onOpenChange={setShowInviteSheet}>
        <SheetContent side="bottom" className="h-[60vh]">
          <SheetHeader>
            <SheetTitle>Invite New Member</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Email Address</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="member@example.com"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="treasurer">Treasurer</SelectItem>
                  <SelectItem value="secretary">Secretary</SelectItem>
                  <SelectItem value="loan_committee">Loan Committee</SelectItem>
                  <SelectItem value="family_admin">Family Admin</SelectItem>
                  <SelectItem value="guest">Guest (Read-only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleInvite} disabled={sending || !inviteEmail}>
              {sending ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Role Change Sheet */}
      <Sheet open={showRoleSheet} onOpenChange={setShowRoleSheet}>
        <SheetContent side="bottom" className="h-[50vh]">
          <SheetHeader>
            <SheetTitle>Change Role</SheetTitle>
          </SheetHeader>
          {selectedMember && (
            <div className="space-y-4 mt-4">
              <Card>
                <CardContent className="p-4">
                  <div className="font-medium">{selectedMember.profiles.full_name}</div>
                  <div className="text-sm text-muted-foreground">
                    Current: {selectedMember.role.replace("_", " ")}
                  </div>
                </CardContent>
              </Card>
              <div>
                <Label>New Role</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="family_head">Family Head</SelectItem>
                    <SelectItem value="family_admin">Family Admin</SelectItem>
                    <SelectItem value="treasurer">Treasurer</SelectItem>
                    <SelectItem value="secretary">Secretary</SelectItem>
                    <SelectItem value="loan_committee">Loan Committee</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="guest">Guest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleRoleChange}>
                Update Role
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

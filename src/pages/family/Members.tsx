import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Search, User, Phone, Mail, Download, Plus,
  Trash2, Shield, UserCog, Loader2, Edit, X, Check
} from "lucide-react";
import { exportMembersToCSV } from "@/lib/export";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileMembers } from "@/components/mobile";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

interface Member {
  id: string;
  user_id: string;
  role: string;
  house_name: string | null;
  is_house_representative: boolean;
  joined_at: string | null;
  profiles: {
    full_name: string;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    is_working: boolean;
  };
  assignedRoles: string[];
}

const ROLE_INFO: Record<string, { label: string; color: string }> = {
  family_head: { label: "Family Head", color: "bg-purple-500" },
  family_admin: { label: "Family Admin", color: "bg-blue-500" },
  secretary: { label: "Secretary", color: "bg-green-500" },
  treasurer: { label: "Treasurer", color: "bg-yellow-500" },
  loan_committee: { label: "Loan Committee", color: "bg-orange-500" },
  member: { label: "Member", color: "bg-gray-500" },
  guest: { label: "Guest", color: "bg-slate-500" },
};

const getRoleLabel = (role: string) =>
  ROLE_INFO[role]?.label || role.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

const Members = () => {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    canManageMembers, family, isLoading: authLoading, userId, isFamilyHead, isFamilyAdmin
  } = useFamilyAuth(familySlug);
  const isMobile = useIsMobile();

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Add member
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [addForm, setAddForm] = useState({ user_id: "", role: "member", house_name: "" });
  const [adding, setAdding] = useState(false);

  // Role management
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [updatingRole, setUpdatingRole] = useState(false);

  // Edit member
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ house_name: "", is_house_representative: false });

  // Remove member
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);

  useEffect(() => {
    if (family) loadMembers();
  }, [family]);

  const loadMembers = async () => {
    if (!family) return;
    try {
      setLoading(true);

      const { data: membersData, error: membersError } = await supabase
        .from("family_members")
        .select("id, user_id, role, house_name, is_house_representative, joined_at")
        .eq("family_id", family.id)
        .order("role");

      if (membersError) throw membersError;

      // Fetch profiles
      const userIds = membersData?.map(m => m.user_id) || [];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, avatar_url, is_working")
        .in("id", userIds);

      // Fetch member_roles
      const memberIds = membersData?.map(m => m.id) || [];
      const { data: rolesData } = await supabase
        .from("member_roles")
        .select("member_id, role")
        .in("member_id", memberIds);

      const rolesByMember: Record<string, string[]> = {};
      (rolesData || []).forEach((r: any) => {
        if (!rolesByMember[r.member_id]) rolesByMember[r.member_id] = [];
        rolesByMember[r.member_id].push(r.role);
      });

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const merged: Member[] = (membersData || []).map(m => ({
        ...m,
        assignedRoles: rolesByMember[m.id] || [m.role],
        profiles: profilesMap.get(m.user_id) || {
          full_name: "Unknown", email: null, phone: null, avatar_url: null, is_working: false,
        },
      })) as Member[];

      setMembers(merged);
    } catch (error: any) {
      console.error("Error loading members:", error);
      toast({ title: "Error", description: "Failed to load members", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    if (!family) return;
    // Get users not already in this family
    const { data: existingMembers } = await supabase
      .from("family_members")
      .select("user_id")
      .eq("family_id", family.id);

    const existingIds = new Set(existingMembers?.map(m => m.user_id) || []);

    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, email");

    setAvailableUsers((allProfiles || []).filter(u => !existingIds.has(u.id)));
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.user_id || !family) return;
    setAdding(true);
    try {
      const { data, error } = await supabase
        .from("family_members")
        .insert({
          family_id: family.id,
          user_id: addForm.user_id,
          role: addForm.role as any,
          house_name: addForm.house_name || null,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Also insert into member_roles
      if (data) {
        await supabase.from("member_roles").insert({
          member_id: data.id,
          role: addForm.role as any,
          assigned_by: userId,
        });
      }

      toast({ title: "Success", description: "Member added successfully" });
      setIsAddOpen(false);
      setAddForm({ user_id: "", role: "member", house_name: "" });
      loadMembers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to add member", variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const toggleRole = async (memberId: string, role: string, currentRoles: string[]) => {
    setUpdatingRole(true);
    try {
      const hasRole = currentRoles.includes(role);
      if (hasRole) {
        if (currentRoles.length <= 1) {
          toast({ title: "Cannot remove", description: "A member must have at least one role", variant: "destructive" });
          setUpdatingRole(false);
          return;
        }
        await supabase.from("member_roles").delete().eq("member_id", memberId).eq("role", role as any);
        const remaining = currentRoles.filter(r => r !== role);
        const primaryRole = remaining.includes("family_head") ? "family_head" :
          remaining.includes("family_admin") ? "family_admin" : remaining[0];
        await supabase.from("family_members").update({ role: primaryRole as any }).eq("id", memberId);
      } else {
        await supabase.from("member_roles").insert({
          member_id: memberId,
          role: role as any,
          assigned_by: userId,
        });
        if (role === "family_head" || role === "family_admin") {
          await supabase.from("family_members").update({ role: role as any }).eq("id", memberId);
        }
      }
      toast({ title: "Success", description: hasRole ? "Role removed" : "Role assigned" });
      loadMembers();
      // Refresh selected member
      if (selectedMember?.id === memberId) {
        const updated = members.find(m => m.id === memberId);
        if (updated) {
          const newRoles = hasRole
            ? currentRoles.filter(r => r !== role)
            : [...currentRoles, role];
          setSelectedMember({ ...updated, assignedRoles: newRoles });
        }
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update role", variant: "destructive" });
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleEditMember = async () => {
    if (!selectedMember) return;
    try {
      const { error } = await supabase
        .from("family_members")
        .update({
          house_name: editForm.house_name || null,
          is_house_representative: editForm.is_house_representative,
        })
        .eq("id", selectedMember.id);

      if (error) throw error;
      toast({ title: "Success", description: "Member updated" });
      setIsEditOpen(false);
      loadMembers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleRemoveMember = async () => {
    if (!removeTarget) return;
    try {
      // Delete member_roles first
      await supabase.from("member_roles").delete().eq("member_id", removeTarget.id);
      const { error } = await supabase.from("family_members").delete().eq("id", removeTarget.id);
      if (error) throw error;
      toast({ title: "Success", description: `${removeTarget.profiles.full_name} has been removed` });
      setRemoveTarget(null);
      loadMembers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const filteredMembers = members.filter(m => {
    const matchesSearch = !searchQuery.trim() ||
      m.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.profiles.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.house_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || m.assignedRoles.includes(roleFilter);
    return matchesSearch && matchesRole;
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isMobile) {
    return <MobileMembers />;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/family/${familySlug}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{family?.name} Members</h1>
              <p className="text-muted-foreground">
                {filteredMembers.length} member{filteredMembers.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportMembersToCSV(filteredMembers)} disabled={filteredMembers.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            {canManageMembers && (
              <>
                <Button variant="outline" onClick={() => navigate(`/family/${familySlug}/role-management`)}>
                  <Shield className="h-4 w-4 mr-2" />
                  Role Management
                </Button>
                <Button onClick={() => { setIsAddOpen(true); loadAvailableUsers(); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by name, email, or house..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {Object.entries(ROLE_INFO).map(([key, info]) => (
                <SelectItem key={key} value={key}>{info.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => (
            <Card key={member.id} className="p-6 hover:shadow-lg transition-shadow relative group">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={member.profiles.avatar_url || undefined} />
                    <AvatarFallback><User className="h-8 w-8" /></AvatarFallback>
                  </Avatar>
                  <div className="flex gap-1">
                    {member.is_house_representative && (
                      <Badge variant="secondary" className="text-xs">House Rep</Badge>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg">{member.profiles.full_name}</h3>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {member.assignedRoles.map(r => (
                      <Badge key={r} variant="outline" className="text-xs">
                        {getRoleLabel(r)}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Link to={`/family/${familySlug}/members/${member.id}`} className="block">
                  {member.house_name && (
                    <p className="text-sm text-muted-foreground hover:underline">
                      House: {member.house_name}
                    </p>
                  )}
                  <div className="space-y-1 text-sm mt-2">
                    {member.profiles.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{member.profiles.email}</span>
                      </div>
                    )}
                    {member.profiles.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{member.profiles.phone}</span>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Management actions for heads/admins */}
                {canManageMembers && member.user_id !== userId && (
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedMember(member);
                        setIsRoleOpen(true);
                      }}
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      Roles
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedMember(member);
                        setEditForm({
                          house_name: member.house_name || "",
                          is_house_representative: member.is_house_representative || false,
                        });
                        setIsEditOpen(true);
                      }}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setRemoveTarget(member)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {filteredMembers.length === 0 && (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No members found.</p>
            </div>
          </Card>
        )}
      </div>

      {/* Add Member Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Family Member</DialogTitle>
            <DialogDescription>Add an existing user to this family.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMember} className="space-y-4">
            <div className="space-y-2">
              <Label>Select User</Label>
              <Select value={addForm.user_id} onValueChange={v => setAddForm(f => ({ ...f, user_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Choose a user..." /></SelectTrigger>
                <SelectContent>
                  {availableUsers.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">No available users</div>
                  ) : (
                    availableUsers.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name} ({u.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Initial Role</Label>
              <Select value={addForm.role} onValueChange={v => setAddForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_INFO).map(([key, info]) => (
                    <SelectItem key={key} value={key}>{info.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>House Name (optional)</Label>
              <Input
                value={addForm.house_name}
                onChange={e => setAddForm(f => ({ ...f, house_name: e.target.value }))}
                placeholder="e.g. House of Elders"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!addForm.user_id || adding}>
                {adding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Member
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Role Management Dialog */}
      <Dialog open={isRoleOpen} onOpenChange={setIsRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Roles</DialogTitle>
            <DialogDescription>
              {selectedMember?.profiles.full_name} — assign or remove roles
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-3">
              {Object.entries(ROLE_INFO).map(([key, info]) => {
                const isChecked = selectedMember.assignedRoles.includes(key);
                return (
                  <label
                    key={key}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${isChecked ? "border-primary bg-primary/5" : ""} ${updatingRole ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleRole(selectedMember.id, key, selectedMember.assignedRoles)}
                      disabled={updatingRole}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{info.label}</div>
                    </div>
                    {updatingRole && <Loader2 className="h-3 w-3 animate-spin" />}
                  </label>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>Update {selectedMember?.profiles.full_name}'s details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>House Name</Label>
              <Input
                value={editForm.house_name}
                onChange={e => setEditForm(f => ({ ...f, house_name: e.target.value }))}
                placeholder="House name"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={editForm.is_house_representative}
                onCheckedChange={v => setEditForm(f => ({ ...f, is_house_representative: !!v }))}
              />
              <Label>House Representative</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button onClick={handleEditMember}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <AlertDialog open={!!removeTarget} onOpenChange={open => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{removeTarget?.profiles.full_name}</strong> from this family?
              This will remove all their roles and data associations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Members;

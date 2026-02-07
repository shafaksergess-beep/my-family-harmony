import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Plus, Trash2, Shield, Download, Edit, Phone, Calendar, Briefcase, Home, User, Search, Filter, Eye, CheckSquare, Square } from "lucide-react";
import { logAdminActivity } from "@/lib/adminLogger";
import { exportToCSV, formatMembersForExport } from "@/lib/export";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { MemberComparison } from "@/components/MemberComparison";

interface FamilyMember {
  id: string;
  user_id: string;
  role: string;
  house_name: string | null;
  is_house_representative: boolean | null;
  joined_at: string | null;
  profiles: {
    full_name: string;
    email: string;
    phone: string | null;
    is_working: boolean | null;
    avatar_url: string | null;
  } | null;
}

const FamilyMembers = () => {
  const { familyId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [family, setFamily] = useState<any>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editMemberId, setEditMemberId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    user_id: "",
    role: "member",
    house_name: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [houseFilter, setHouseFilter] = useState<string>("all");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>("");
  const [bulkRole, setBulkRole] = useState<string>("");
  const [bulkHouse, setBulkHouse] = useState<string>("");

  useEffect(() => {
    loadData();
  }, [familyId]);

  const loadData = async () => {
    try {
      // Load family
      const { data: familyData } = await supabase
        .from("families")
        .select("*")
        .eq("id", familyId)
        .single();
      
      setFamily(familyData);

      // Load members
      const { data: membersData } = await supabase
        .from("family_members")
        .select(`
          id,
          user_id,
          role,
          house_name,
          is_house_representative,
          joined_at,
          profiles!inner (full_name, email, phone, is_working, avatar_url)
        `)
        .eq("family_id", familyId);
      
      setMembers((membersData || []).map(m => ({
        ...m,
        profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
      })) as FamilyMember[]);

      // Load all users and all assigned user IDs
      const { data: usersData } = await supabase
        .from("profiles")
        .select("id, full_name, email");
      
      // Get all user IDs that are already members of ANY family
      const { data: allAssignedMembers } = await supabase
        .from("family_members")
        .select("user_id");
      
      const assignedUserIds = new Set(allAssignedMembers?.map(m => m.user_id) || []);
      
      // Filter to show only unassigned users
      const unassignedUsers = (usersData || []).filter(user => !assignedUserIds.has(user.id));
      
      setAllUsers(unassignedUsers);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: t("common.error"),
        description: t("admin.loadFailed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data, error } = await supabase
        .from("family_members")
        .insert([{
          family_id: familyId,
          user_id: formData.user_id,
          role: formData.role as any,
          house_name: formData.house_name || null,
        }])
        .select()
        .single();

      if (error) throw error;
      
      // Log activity
      const user = allUsers.find(u => u.id === formData.user_id);
      await logAdminActivity({
        action_type: 'create',
        entity_type: 'family_member',
        entity_id: data?.id,
        details: { 
          family_name: family?.name,
          user_name: user?.full_name,
          role: formData.role 
        },
        sendNotification: true
      });
      
      toast({
        title: t("common.success"),
        description: t("admin.memberAdded"),
      });

      setIsDialogOpen(false);
      setFormData({ user_id: "", role: "member", house_name: "" });
      loadData();
    } catch (error: any) {
      console.error("Error adding member:", error);
      toast({
        title: t("common.error"),
        description: error.message || t("admin.addMemberFailed"),
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm(t("admin.removeMemberConfirm"))) return;

    try {
      const member = members.find(m => m.id === memberId);
      
      const { error } = await supabase
        .from("family_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
      
      // Log activity
      await logAdminActivity({
        action_type: 'delete',
        entity_type: 'family_member',
        entity_id: memberId,
        details: { 
          family_name: family?.name,
          member_name: member?.profiles?.full_name 
        },
        sendNotification: true
      });
      
      toast({
        title: t("common.success"),
        description: t("admin.memberRemoved"),
      });
      loadData();
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast({
        title: t("common.error"),
        description: error.message || t("admin.removeMemberFailed"),
        variant: "destructive",
      });
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
    try {
      const member = members.find(m => m.id === memberId);
      
      const { error } = await supabase
        .from("family_members")
        .update({ role: newRole as any })
        .eq("id", memberId);

      if (error) throw error;

      await logAdminActivity({
        action_type: 'update',
        entity_type: 'family_member',
        entity_id: memberId,
        details: { 
          family_name: family?.name,
          member_name: member?.profiles?.full_name,
          new_role: newRole 
        },
        sendNotification: true
      });

      toast({
        title: t("common.success"),
        description: "Member role updated successfully",
      });
      
      setEditMemberId(null);
      loadData();
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast({
        title: t("common.error"),
        description: error.message || "Failed to update member role",
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    const formatted = formatMembersForExport(members);
    exportToCSV(formatted, `${family?.slug}-members-${new Date().toISOString().split('T')[0]}`);
    
    logAdminActivity({
      action_type: 'export',
      entity_type: 'family_member',
      details: { family_name: family?.name, count: members.length }
    });
    
    toast({
      title: t("common.success"),
      description: "Members exported successfully",
    });
  };

  const toggleMemberSelection = (memberId: string) => {
    const newSelection = new Set(selectedMembers);
    if (newSelection.has(memberId)) {
      newSelection.delete(memberId);
    } else {
      newSelection.add(memberId);
    }
    setSelectedMembers(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedMembers.size === filteredMembers.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(filteredMembers.map(m => m.id)));
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedMembers.size === 0) return;

    try {
      if (bulkAction === "role" && bulkRole) {
        // Bulk role assignment
        const updates = Array.from(selectedMembers).map(memberId => 
          supabase.from("family_members").update({ role: bulkRole as any }).eq("id", memberId)
        );
        await Promise.all(updates);
        
        toast({
          title: t("common.success"),
          description: `Updated role for ${selectedMembers.size} members`,
        });
      } else if (bulkAction === "house" && bulkHouse) {
        // Bulk house assignment
        const updates = Array.from(selectedMembers).map(memberId => 
          supabase.from("family_members").update({ house_name: bulkHouse }).eq("id", memberId)
        );
        await Promise.all(updates);
        
        toast({
          title: t("common.success"),
          description: `Updated house for ${selectedMembers.size} members`,
        });
      } else if (bulkAction === "export") {
        // Export selected members
        const selectedMemberData = members.filter(m => selectedMembers.has(m.id));
        const formatted = formatMembersForExport(selectedMemberData);
        exportToCSV(formatted, `${family?.slug}-selected-members-${new Date().toISOString().split('T')[0]}`);
        
        toast({
          title: t("common.success"),
          description: `Exported ${selectedMembers.size} members`,
        });
      }

      await logAdminActivity({
        action_type: 'update',
        entity_type: 'family_member',
        details: { 
          family_name: family?.name,
          action: bulkAction,
          count: selectedMembers.size 
        }
      });

      setSelectedMembers(new Set());
      setBulkAction("");
      setBulkRole("");
      setBulkHouse("");
      loadData();
    } catch (error: any) {
      console.error("Bulk action error:", error);
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = 
      member.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    const matchesHouse = houseFilter === "all" || member.house_name === houseFilter;
    
    return matchesSearch && matchesRole && matchesHouse;
  });

  const uniqueHouses = Array.from(new Set(members.map(m => m.house_name).filter(Boolean)));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/admin/families")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("common.back")}
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{family?.name} - {t("admin.members")}</h1>
                <p className="text-sm text-muted-foreground">
                  {t("admin.manageFamilyMembers")} • {members.length} members
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <MemberComparison familyId={familyId!} members={members} />
              {members.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export All
                </Button>
              )}
              <LanguageSwitcher />
            
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("admin.addMember")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("admin.addFamilyMember")}</DialogTitle>
                    <DialogDescription>
                      {t("admin.addExistingUser")}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddMember} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="user">{t("admin.selectUser")}</Label>
                      <Select value={formData.user_id} onValueChange={(value) => setFormData({ ...formData, user_id: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("admin.selectUser")} />
                        </SelectTrigger>
                        <SelectContent>
                          {allUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.full_name} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">{t("admin.role")}</Label>
                      <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">{t("roles.member")}</SelectItem>
                          <SelectItem value="family_head">{t("roles.family_head")}</SelectItem>
                          <SelectItem value="family_admin">{t("roles.family_admin")}</SelectItem>
                          <SelectItem value="treasurer">{t("roles.treasurer")}</SelectItem>
                          <SelectItem value="secretary">{t("roles.secretary")}</SelectItem>
                          <SelectItem value="loan_committee">{t("roles.loan_committee")}</SelectItem>
                          <SelectItem value="guest">{t("roles.guest")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="house">{t("admin.houseName")}</Label>
                      <Input
                        id="house"
                        value={formData.house_name}
                        onChange={(e) => setFormData({ ...formData, house_name: e.target.value })}
                        placeholder={t("admin.houseNamePlaceholder")}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        {t("common.cancel")}
                      </Button>
                      <Button type="submit">{t("admin.addMember")}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search members by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="family_head">Family Head</SelectItem>
                <SelectItem value="family_admin">Family Admin</SelectItem>
                <SelectItem value="treasurer">Treasurer</SelectItem>
                <SelectItem value="secretary">Secretary</SelectItem>
                <SelectItem value="loan_committee">Loan Committee</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="guest">Guest</SelectItem>
              </SelectContent>
            </Select>
            <Select value={houseFilter} onValueChange={setHouseFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Home className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by house" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Houses</SelectItem>
                {uniqueHouses.map(house => (
                  <SelectItem key={house} value={house!}>{house}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedMembers.size === filteredMembers.length && filteredMembers.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                {selectedMembers.size > 0 ? `${selectedMembers.size} selected` : "Select all"}
              </span>
            </div>
            
            {selectedMembers.size > 0 && (
              <div className="flex items-center gap-2">
                <Select value={bulkAction} onValueChange={setBulkAction}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Bulk action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="role">Assign Role</SelectItem>
                    <SelectItem value="house">Assign House</SelectItem>
                    <SelectItem value="export">Export Selected</SelectItem>
                  </SelectContent>
                </Select>
                
                {bulkAction === "role" && (
                  <Select value={bulkRole} onValueChange={setBulkRole}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="family_head">Family Head</SelectItem>
                      <SelectItem value="treasurer">Treasurer</SelectItem>
                      <SelectItem value="loan_committee">Loan Committee</SelectItem>
                      <SelectItem value="guest">Guest</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                
                {bulkAction === "house" && (
                  <Input
                    placeholder="House name"
                    value={bulkHouse}
                    onChange={(e) => setBulkHouse(e.target.value)}
                    className="w-40"
                  />
                )}
                
                <Button onClick={handleBulkAction} disabled={!bulkAction || (bulkAction === "role" && !bulkRole) || (bulkAction === "house" && !bulkHouse)}>
                  Apply
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4">
            {filteredMembers.map((member) => (
              <Card key={member.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedMembers.has(member.id)}
                        onCheckedChange={() => toggleMemberSelection(member.id)}
                      />
                      {member.profiles?.avatar_url && (
                        <img 
                          src={member.profiles.avatar_url} 
                          alt={member.profiles.full_name || 'User'} 
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {member.profiles?.full_name || 'Unknown'}
                          {member.is_house_representative && (
                            <Badge variant="secondary" className="text-xs">
                              <Home className="w-3 h-3 mr-1" />
                              House Rep
                            </Badge>
                          )}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{member.profiles?.email || 'No email'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => navigate(`/admin/families/${familyId}/members/${member.id}`)}
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => setEditMemberId(member.id)}
                        title="Change role"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => handleRemoveMember(member.id)}
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {editMemberId === member.id ? (
                    <div className="space-y-2">
                      <Label>Change Role</Label>
                      <Select
                        defaultValue={member.role}
                        onValueChange={(value) => handleUpdateMemberRole(member.id, value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="family_head">Family Head</SelectItem>
                          <SelectItem value="family_admin">Family Admin</SelectItem>
                          <SelectItem value="treasurer">Treasurer</SelectItem>
                          <SelectItem value="secretary">Secretary</SelectItem>
                          <SelectItem value="loan_committee">Loan Committee</SelectItem>
                          <SelectItem value="guest">Guest</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setEditMemberId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{t("admin.role")}: </span>
                      <Badge variant="secondary">
                        <Shield className="w-3 h-3 mr-1" />
                        {t(`roles.${member.role}`)}
                      </Badge>
                      {member.role === 'family_head' && (
                        <Badge variant="outline" className="text-xs">{t("roles.canManageMembers")}</Badge>
                      )}
                      {(member.role === 'treasurer' || member.role === 'family_head') && (
                        <Badge variant="outline" className="text-xs">{t("roles.canManageFinances")}</Badge>
                      )}
                      {member.role === 'loan_committee' && (
                        <Badge variant="outline" className="text-xs">{t("roles.canApproveLoans")}</Badge>
                      )}
                      {member.role === 'guest' && (
                        <Badge variant="outline" className="text-xs">{t("roles.canViewOnly")}</Badge>
                      )}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {member.profiles?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{member.profiles.phone}</span>
                      </div>
                    )}
                    
                    {member.house_name && (
                      <div className="flex items-center gap-2">
                        <Home className="w-4 h-4 text-muted-foreground" />
                        <span>{member.house_name}</span>
                      </div>
                    )}
                    
                    {member.joined_at && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>Joined: {new Date(member.joined_at).toLocaleDateString()}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      <span>{member.profiles?.is_working ? 'Working' : 'Not Working'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default FamilyMembers;

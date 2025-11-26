import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FamilyMember {
  id: string;
  user_id: string;
  role: string;
  house_name: string | null;
  profiles: {
    full_name: string;
    email: string;
  } | null;
}

const FamilyMembers = () => {
  const { familyId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [family, setFamily] = useState<any>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    user_id: "",
    role: "member",
    house_name: "",
  });

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
          profiles!inner (full_name, email)
        `)
        .eq("family_id", familyId);
      
      setMembers((membersData || []).map(m => ({
        ...m,
        profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
      })) as FamilyMember[]);

      // Load all users
      const { data: usersData } = await supabase
        .from("profiles")
        .select("id, full_name, email");
      
      setAllUsers(usersData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from("family_members")
        .insert([{
          family_id: familyId,
          user_id: formData.user_id,
          role: formData.role as any,
          house_name: formData.house_name || null,
        }]);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Member added successfully",
      });

      setIsDialogOpen(false);
      setFormData({ user_id: "", role: "member", house_name: "" });
      loadData();
    } catch (error: any) {
      console.error("Error adding member:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add member",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const { error } = await supabase
        .from("family_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Member removed successfully",
      });
      loadData();
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove member",
        variant: "destructive",
      });
    }
  };

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
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{family?.name} - Members</h1>
                <p className="text-sm text-muted-foreground">Manage family members and roles</p>
              </div>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Family Member</DialogTitle>
                  <DialogDescription>
                    Add an existing user to this family
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddMember} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="user">User</Label>
                    <Select value={formData.user_id} onValueChange={(value) => setFormData({ ...formData, user_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {allUsers.filter(u => !members.find(m => m.user_id === u.id)).map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="family_head">Family Head</SelectItem>
                        <SelectItem value="treasurer">Treasurer</SelectItem>
                        <SelectItem value="loan_committee">Loan Committee</SelectItem>
                        <SelectItem value="guest">Guest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="house">House Name (Optional)</Label>
                    <Input
                      id="house"
                      value={formData.house_name}
                      onChange={(e) => setFormData({ ...formData, house_name: e.target.value })}
                      placeholder="e.g., House A"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Add Member</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-4">
            {members.map((member) => (
              <Card key={member.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{member.profiles?.full_name || 'Unknown'}</CardTitle>
                      <p className="text-sm text-muted-foreground">{member.profiles?.email || 'No email'}</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => handleRemoveMember(member.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <div>
                    <span className="text-sm font-medium">Role: </span>
                    <span className="text-sm px-2 py-1 rounded bg-primary/10 text-primary">
                      {member.role.replace("_", " ").toUpperCase()}
                    </span>
                  </div>
                  {member.house_name && (
                    <div>
                      <span className="text-sm font-medium">House: </span>
                      <span className="text-sm">{member.house_name}</span>
                    </div>
                  )}
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

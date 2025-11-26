import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Mail, Check, X, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRecaptcha } from "@/hooks/useRecaptcha";

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
  profiles: { full_name: string };
}

const Invitations = () => {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { family, isFamilyHead, isLoading } = useFamilyAuth(familySlug);
  const { toast } = useToast();
  const { getRecaptchaToken } = useRecaptcha();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    role: "member",
  });

  useEffect(() => {
    if (family) {
      loadInvitations();
    }
  }, [family]);

  const loadInvitations = async () => {
    if (!family) return;

    try {
      // Fetch invitations
      const { data: invitationsData, error: invError } = await supabase
        .from("invitations")
        .select("*")
        .eq("family_id", family.id)
        .order("created_at", { ascending: false });

      if (invError) throw invError;

      // Fetch profiles for invited_by users
      const invitedByIds = [...new Set(invitationsData?.map(i => i.invited_by) || [])];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", invitedByIds);

      if (profilesError) throw profilesError;

      // Merge data
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const mergedData = invitationsData?.map(inv => ({
        ...inv,
        profiles: profilesMap.get(inv.invited_by) || { full_name: "Unknown" },
      })) || [];

      setInvitations(mergedData as any);
    } catch (error) {
      console.error("Error loading invitations:", error);
      toast({
        title: "Error",
        description: "Failed to load invitations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!family || !isFamilyHead) return;

    setSending(true);
    try {
      // Get reCAPTCHA token
      const recaptchaToken = await getRecaptchaToken("invite");
      if (!recaptchaToken) {
        setSending(false);
        return;
      }

      // Generate invitation token
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      // Create invitation
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: invitation, error: invError } = await supabase
        .from("invitations")
        .insert([{
          family_id: family.id,
          email: formData.email,
          role: formData.role as any,
          token: token,
          expires_at: expiresAt.toISOString(),
          invited_by: user.id,
        }])
        .select()
        .single();

      if (invError) throw invError;

      // Send invitation email with reCAPTCHA token
      const { error: emailError } = await supabase.functions.invoke("send-invitation", {
        body: { 
          invitationId: invitation.id,
          recaptchaToken,
        },
      });

      if (emailError) throw emailError;

      toast({
        title: "Invitation Sent",
        description: `Invitation sent to ${formData.email}`,
      });

      setFormData({ email: "", role: "member" });
      loadInvitations();
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (invitation: Invitation) => {
    if (invitation.status === "accepted") {
      return <Badge className="bg-green-500"><Check className="w-3 h-3 mr-1" />Accepted</Badge>;
    }
    if (invitation.status === "declined") {
      return <Badge variant="destructive"><X className="w-3 h-3 mr-1" />Declined</Badge>;
    }
    if (new Date(invitation.expires_at) < new Date()) {
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Expired</Badge>;
    }
    return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isFamilyHead) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Only family heads can manage invitations</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(`/family/${familySlug}`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Member Invitations</h1>
              <p className="text-sm text-muted-foreground">Invite new members to join {family?.name}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Send Invitation Form */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Send Invitation</CardTitle>
              <CardDescription>Invite a new member to your family</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendInvitation} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="member@example.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="treasurer">Treasurer</SelectItem>
                      <SelectItem value="loan_committee">Loan Committee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={sending}>
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Invitations List */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Sent Invitations</CardTitle>
              <CardDescription>Track all invitations sent to potential members</CardDescription>
            </CardHeader>
            <CardContent>
              {invitations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No invitations sent yet</p>
              ) : (
                <div className="space-y-4">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{invitation.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Role: {invitation.role.replace("_", " ").toUpperCase()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Invited by {invitation.profiles?.full_name} on{" "}
                          {new Date(invitation.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div>{getStatusBadge(invitation)}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Invitations;

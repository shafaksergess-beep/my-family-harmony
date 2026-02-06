import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Mail, Check, X, Clock, Share2, Link2, QrCode, UserPlus, Copy, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import { ShareInvitationSheet } from "@/components/invitations/ShareInvitationSheet";
import { PendingJoinRequests } from "@/components/invitations/PendingJoinRequests";
import { ContactsPicker } from "@/components/invitations/ContactsPicker";

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
  reference_code?: string;
  invitation_type?: string;
  token: string;
  profiles: { full_name: string };
}

const Invitations = () => {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { family, isFamilyHead, isFamilyAdmin, isLoading } = useFamilyAuth(familySlug);
  const { toast } = useToast();
  const { getRecaptchaToken } = useRecaptcha();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    role: "member",
    expirationDays: "7",
  });

  const canManageInvitations = isFamilyHead || isFamilyAdmin;

  useEffect(() => {
    if (family) {
      loadInvitations();
    }
  }, [family]);

  const loadInvitations = async () => {
    if (!family) return;

    try {
      const { data: invitationsData, error: invError } = await supabase
        .from("invitations")
        .select("*")
        .eq("family_id", family.id)
        .order("created_at", { ascending: false });

      if (invError) throw invError;

      // Fetch profiles for invited_by users
      const invitedByIds = [...new Set(invitationsData?.map(i => i.invited_by) || [])];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", invitedByIds);

      // Merge data
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const mergedData = invitationsData?.map(inv => ({
        ...inv,
        profiles: profilesMap.get(inv.invited_by) || { full_name: "Unknown" },
      })) || [];

      setInvitations(mergedData as Invitation[]);
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

  const generateReferenceCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateInvitation = async (data: { 
    email?: string; 
    role: string; 
    expirationDays: number; 
    type: string;
  }) => {
    if (!family) return;

    setSending(true);
    try {
      const recaptchaToken = await getRecaptchaToken("invite");
      if (!recaptchaToken) {
        setSending(false);
        return;
      }

      const token = crypto.randomUUID();
      const referenceCode = generateReferenceCode();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + data.expirationDays);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: invitation, error: invError } = await supabase
        .from("invitations")
        .insert([{
          family_id: family.id,
          email: data.email || `link-${Date.now()}@placeholder.local`,
          role: data.role as any,
          token: token,
          reference_code: referenceCode,
          invitation_type: data.type,
          expires_at: expiresAt.toISOString(),
          invited_by: user.id,
        }])
        .select()
        .single();

      if (invError) throw invError;

      // Send email if email invitation
      if (data.email && data.type === "email") {
        await supabase.functions.invoke("send-invitation", {
          body: { invitationId: invitation.id, recaptchaToken },
        });
        toast({
          title: "Invitation Sent",
          description: `Invitation sent to ${data.email}`,
        });
      } else {
        // Show share dialog for link invitations
        setSelectedInvitation({
          ...invitation,
          profiles: { full_name: "You" },
        });
        setShareDialogOpen(true);
        toast({
          title: "Invitation Created",
          description: "Share the link or code with your invitee",
        });
      }

      setFormData({ email: "", role: "member", expirationDays: "7" });
      loadInvitations();
    } catch (error: any) {
      console.error("Error creating invitation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create invitation",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleQuickShare = async () => {
    await handleCreateInvitation({
      role: "member",
      expirationDays: 7,
      type: "link",
    });
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied!", description: `${label} copied to clipboard` });
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const getStatusBadge = (invitation: Invitation) => {
    if (invitation.status === "accepted") {
      return <Badge className="bg-green-600"><Check className="w-3 h-3 mr-1" />Accepted</Badge>;
    }
    if (invitation.status === "declined") {
      return <Badge variant="destructive"><X className="w-3 h-3 mr-1" />Declined</Badge>;
    }
    if (new Date(invitation.expires_at) < new Date()) {
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Expired</Badge>;
    }
    return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  };

  const getInviteLink = (invitation: Invitation) => {
    return `${window.location.origin}/accept-invitation?token=${invitation.token}`;
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canManageInvitations) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Only family heads and admins can manage invitations</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate(`/family/${familySlug}`)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Invitations & Join Requests</h1>
                <p className="text-sm text-muted-foreground">Manage who joins {family?.name}</p>
              </div>
            </div>
            <Button onClick={handleQuickShare} disabled={sending}>
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Share2 className="w-4 h-4 mr-2" />}
              Quick Share Link
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Join Requests Section */}
        {family && (
          <PendingJoinRequests familyId={family.id} familySlug={familySlug || ""} />
        )}

        {/* Invitations Management */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Invitation Form */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Create Invitation
              </CardTitle>
              <CardDescription>Invite new members via email or shareable link</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="email" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="email" className="gap-1">
                    <Mail className="w-3 h-3" />
                    Email
                  </TabsTrigger>
                  <TabsTrigger value="contacts" className="gap-1">
                    <Users className="w-3 h-3" />
                    Contacts
                  </TabsTrigger>
                  <TabsTrigger value="link" className="gap-1">
                    <Link2 className="w-3 h-3" />
                    Link
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="email" className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="member@example.com"
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
                        <SelectItem value="secretary">Secretary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="expiration">Expires In</Label>
                    <Select
                      value={formData.expirationDays}
                      onValueChange={(value) => setFormData({ ...formData, expirationDays: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 day</SelectItem>
                        <SelectItem value="3">3 days</SelectItem>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => handleCreateInvitation({
                      email: formData.email,
                      role: formData.role,
                      expirationDays: parseInt(formData.expirationDays),
                      type: "email",
                    })}
                    className="w-full"
                    disabled={sending || !formData.email}
                  >
                    {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                    Send Email Invitation
                  </Button>
                </TabsContent>

                <TabsContent value="contacts" className="space-y-4">
                  <div className="text-center py-4">
                    <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Import contacts from your phone to quickly invite family members
                    </p>
                    <ContactsPicker
                      disabled={sending}
                      onSelectContacts={async (contacts) => {
                        for (const contact of contacts) {
                          if (contact.email) {
                            await handleCreateInvitation({
                              email: contact.email,
                              role: formData.role,
                              expirationDays: parseInt(formData.expirationDays),
                              type: "email",
                            });
                          }
                        }
                        toast({
                          title: "Invitations Sent",
                          description: `Sent ${contacts.filter(c => c.email).length} email invitations`,
                        });
                      }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    Only contacts with email addresses will receive invitations
                  </div>
                </TabsContent>

                <TabsContent value="link" className="space-y-4">
                  <div>
                    <Label htmlFor="link-role">Role</Label>
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
                        <SelectItem value="secretary">Secretary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="link-expiration">Expires In</Label>
                    <Select
                      value={formData.expirationDays}
                      onValueChange={(value) => setFormData({ ...formData, expirationDays: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 day</SelectItem>
                        <SelectItem value="3">3 days</SelectItem>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => handleCreateInvitation({
                      role: formData.role,
                      expirationDays: parseInt(formData.expirationDays),
                      type: "link",
                    })}
                    className="w-full"
                    disabled={sending}
                  >
                    {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
                    Generate Shareable Link
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Creates a link and reference code you can share via any channel
                  </p>
                </TabsContent>
              </Tabs>
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
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No invitations sent yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">
                            {invitation.invitation_type === "link" 
                              ? "Link Invitation" 
                              : invitation.email
                            }
                          </p>
                          {invitation.reference_code && (
                            <Badge variant="outline" className="font-mono text-xs">
                              {invitation.reference_code}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Role: {invitation.role.replace("_", " ").toUpperCase()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Invited by {invitation.profiles?.full_name} • Expires {new Date(invitation.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(invitation)}
                        {invitation.status === "pending" && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyToClipboard(invitation.reference_code || "", "Reference code")}
                              title="Copy code"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedInvitation(invitation);
                                setShareDialogOpen(true);
                              }}
                              title="Share"
                            >
                              <Share2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Share Dialog */}
      {selectedInvitation && family && (
        <ShareInvitationSheet
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          familyName={family.name}
          familySlug={familySlug || ""}
          familyLogo={family.logo_url}
          familyDescription={family.description}
          inviteLink={getInviteLink(selectedInvitation)}
          referenceCode={selectedInvitation.reference_code || ""}
          expiresAt={selectedInvitation.expires_at}
          role={selectedInvitation.role}
          onCreateInvitation={handleCreateInvitation}
        />
      )}
    </div>
  );
};

export default Invitations;

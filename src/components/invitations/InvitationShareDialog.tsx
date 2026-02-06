import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Copy, QrCode, Share2, Link2, Mail, Clock, Users } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface InvitationShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyName: string;
  familySlug: string;
  inviteLink: string;
  referenceCode: string;
  expiresAt: string;
  role: string;
  onCreateInvitation: (data: { email?: string; role: string; expirationDays: number; type: string }) => Promise<void>;
}

export const InvitationShareDialog = ({
  open,
  onOpenChange,
  familyName,
  familySlug,
  inviteLink,
  referenceCode,
  expiresAt,
  role,
  onCreateInvitation,
}: InvitationShareDialogProps) => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState("member");
  const [expirationDays, setExpirationDays] = useState("7");
  const [creating, setCreating] = useState(false);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please copy manually",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `Join ${familyName} on Family Together`,
      text: `You've been invited to join ${familyName}. Use code: ${referenceCode}`,
      url: inviteLink,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error: any) {
        if (error.name !== "AbortError") {
          copyToClipboard(inviteLink, "Invitation link");
        }
      }
    } else {
      copyToClipboard(inviteLink, "Invitation link");
    }
  };

  const handleCreateNew = async () => {
    setCreating(true);
    try {
      await onCreateInvitation({
        email: email || undefined,
        role: selectedRole,
        expirationDays: parseInt(expirationDays),
        type: email ? "email" : "link",
      });
      setEmail("");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Invite to {familyName}
          </DialogTitle>
          <DialogDescription>
            Share an invitation link, QR code, or send directly via email
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="share" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="share">Share Link</TabsTrigger>
            <TabsTrigger value="qr">QR Code</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
          </TabsList>

          <TabsContent value="share" className="space-y-4">
            {/* Reference Code */}
            <div className="p-4 bg-muted rounded-lg text-center">
              <Label className="text-xs text-muted-foreground mb-1 block">Reference Code</Label>
              <div className="text-2xl font-mono font-bold tracking-wider text-primary">
                {referenceCode || "XXXXXXXX"}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-2"
                onClick={() => copyToClipboard(referenceCode, "Reference code")}
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy Code
              </Button>
            </div>

            {/* Invite Link */}
            <div className="space-y-2">
              <Label>Invitation Link</Label>
              <div className="flex gap-2">
                <Input 
                  value={inviteLink || `${window.location.origin}/join/${familySlug}`} 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => copyToClipboard(inviteLink, "Invitation link")}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Expiration Info */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>
                Expires: {expiresAt ? new Date(expiresAt).toLocaleDateString() : "7 days from creation"}
              </span>
            </div>

            {/* Share Button */}
            <Button onClick={handleShare} className="w-full">
              <Share2 className="w-4 h-4 mr-2" />
              Share Invitation
            </Button>
          </TabsContent>

          <TabsContent value="qr" className="space-y-4">
            <div className="flex flex-col items-center p-6 bg-white rounded-lg">
              <QRCodeSVG 
                value={inviteLink || `${window.location.origin}/join/${familySlug}?code=${referenceCode}`}
                size={200}
                level="H"
                includeMargin
              />
              <p className="mt-4 text-sm text-muted-foreground text-center">
                Scan this QR code to join {familyName}
              </p>
              <div className="mt-2 text-center">
                <p className="text-xs text-muted-foreground">Or enter code:</p>
                <p className="font-mono font-bold text-lg">{referenceCode}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Great for in-person sharing at family meetings
            </p>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="member@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="invite-role">Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
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
                <Label htmlFor="expiration">Link Expires In</Label>
                <Select value={expirationDays} onValueChange={setExpirationDays}>
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
                onClick={handleCreateNew} 
                className="w-full"
                disabled={!email || creating}
              >
                <Mail className="w-4 h-4 mr-2" />
                {creating ? "Sending..." : "Send Email Invitation"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Permissions Transparency */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-start gap-2">
            <Users className="w-4 h-4 mt-0.5 text-muted-foreground" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">What joining means:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Access to family meetings and events</li>
                <li>View family contributions and records</li>
                <li>Participate in family activities based on role</li>
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

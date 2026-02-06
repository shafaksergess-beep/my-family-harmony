import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Copy, QrCode, Share2, Link2, Mail, Clock, Users, Download, Infinity, Timer, Zap } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface ShareInvitationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyName: string;
  familySlug: string;
  familyLogo?: string;
  familyDescription?: string;
  inviteLink: string;
  referenceCode: string;
  expiresAt: string;
  role: string;
  onCreateInvitation: (data: { 
    email?: string; 
    role: string; 
    expirationDays: number; 
    type: string;
    usageLimit?: "one_time" | "unlimited";
  }) => Promise<void>;
}

export const ShareInvitationSheet = ({
  open,
  onOpenChange,
  familyName,
  familySlug,
  familyLogo,
  familyDescription,
  inviteLink,
  referenceCode,
  expiresAt,
  role,
  onCreateInvitation,
}: ShareInvitationSheetProps) => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState("member");
  const [expirationDays, setExpirationDays] = useState("7");
  const [usageLimit, setUsageLimit] = useState<"one_time" | "unlimited">("one_time");
  const [creating, setCreating] = useState(false);

  const familyInitials = familyName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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
      title: `Join ${familyName} on Kinsroot`,
      text: `You've been invited to join ${familyName}! Use code: ${referenceCode}`,
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
        usageLimit,
      });
      setEmail("");
    } finally {
      setCreating(false);
    }
  };

  const downloadQRCode = () => {
    const canvas = document.getElementById("qr-code-canvas") as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${familySlug}-invite-qr.png`;
      a.click();
    }
  };

  const getExpirationLabel = (days: string) => {
    if (days === "1") return "24 hours";
    return `${days} days`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Invitation
          </DialogTitle>
          <DialogDescription>
            Invite someone to join your family
          </DialogDescription>
        </DialogHeader>

        {/* Branded Preview Card */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={familyLogo} />
                <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                  {familyInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold">{familyName}</h3>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {familyDescription || "Family community on Kinsroot"}
                </p>
              </div>
            </div>
            {referenceCode && (
              <div className="mt-3 pt-3 border-t border-primary/20 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Invite Code:</span>
                <Badge variant="outline" className="font-mono text-lg tracking-wider">
                  {referenceCode}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="share" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="share" className="gap-1">
              <Link2 className="w-3 h-3" />
              Link
            </TabsTrigger>
            <TabsTrigger value="qr" className="gap-1">
              <QrCode className="w-3 h-3" />
              QR Code
            </TabsTrigger>
            <TabsTrigger value="create" className="gap-1">
              <Zap className="w-3 h-3" />
              New
            </TabsTrigger>
          </TabsList>

          <TabsContent value="share" className="space-y-4 mt-4">
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

          <TabsContent value="qr" className="space-y-4 mt-4">
            <div className="flex flex-col items-center p-6 bg-white rounded-lg">
              <QRCodeSVG 
                id="qr-code-svg"
                value={inviteLink || `${window.location.origin}/join/${familySlug}?code=${referenceCode}`}
                size={180}
                level="H"
                includeMargin
              />
              <p className="mt-4 text-sm text-muted-foreground text-center">
                Scan to join <strong>{familyName}</strong>
              </p>
              <div className="mt-2 text-center">
                <p className="text-xs text-muted-foreground">Or enter code:</p>
                <p className="font-mono font-bold text-lg">{referenceCode}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" className="flex-1" onClick={downloadQRCode}>
                <Download className="w-4 h-4 mr-2" />
                Save QR
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Great for in-person sharing at family meetings
            </p>
          </TabsContent>

          <TabsContent value="create" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="invite-email">Email Address (Optional)</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="member@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to create a shareable link
                </p>
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
                <Label htmlFor="expiration">Expires In</Label>
                <Select value={expirationDays} onValueChange={setExpirationDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">
                      <div className="flex items-center gap-2">
                        <Timer className="w-3 h-3" />
                        24 hours
                      </div>
                    </SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Usage Limit</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button
                    type="button"
                    variant={usageLimit === "one_time" ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => setUsageLimit("one_time")}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    One-time use
                  </Button>
                  <Button
                    type="button"
                    variant={usageLimit === "unlimited" ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => setUsageLimit("unlimited")}
                  >
                    <Infinity className="w-4 h-4 mr-2" />
                    Unlimited
                  </Button>
                </div>
              </div>

              <Button 
                onClick={handleCreateNew} 
                className="w-full"
                disabled={creating}
              >
                {creating ? "Creating..." : email ? "Send Email Invitation" : "Create Shareable Link"}
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

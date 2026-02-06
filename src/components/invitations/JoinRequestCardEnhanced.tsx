import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Check, X, MessageSquare, Clock, Mail, Phone, HelpCircle, PartyPopper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface JoinRequest {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  message?: string;
  status: string;
  reference_code_used?: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  welcome_message?: string;
  rejection_reason?: string;
  user_id?: string;
  profiles?: {
    avatar_url?: string;
    full_name: string;
  };
  reviewer?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface JoinRequestCardEnhancedProps {
  request: JoinRequest;
  familyId: string;
  onApprove: (id: string, welcomeMessage?: string) => Promise<void>;
  onReject: (id: string, reason?: string) => Promise<void>;
  onRefresh: () => void;
}

export const JoinRequestCardEnhanced = ({ 
  request, 
  familyId,
  onApprove, 
  onReject,
  onRefresh,
}: JoinRequestCardEnhancedProps) => {
  const { toast } = useToast();
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showRequestInfoDialog, setShowRequestInfoDialog] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [infoRequest, setInfoRequest] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleApprove = async () => {
    setProcessing(true);
    try {
      await onApprove(request.id, welcomeMessage);
      setShowApproveDialog(false);
      setWelcomeMessage("");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    setProcessing(true);
    try {
      await onReject(request.id, rejectionReason);
      setShowRejectDialog(false);
      setRejectionReason("");
    } finally {
      setProcessing(false);
    }
  };

  const handleRequestInfo = async () => {
    setProcessing(true);
    try {
      // Update request with info request (could trigger notification)
      const { error } = await supabase
        .from("join_requests")
        .update({
          status: "info_requested",
          rejection_reason: `More information needed: ${infoRequest}`,
        })
        .eq("id", request.id);

      if (error) throw error;

      toast({
        title: "Information Requested",
        description: `Asked ${request.full_name} for more details`,
      });

      setShowRequestInfoDialog(false);
      setInfoRequest("");
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to request info",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const initials = request.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const isPending = request.status === "pending";
  const isInfoRequested = request.status === "info_requested";

  return (
    <>
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <Avatar className="w-12 h-12">
              <AvatarImage src={request.profiles?.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold truncate">{request.full_name}</h4>
                {request.reference_code_used && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    Code: {request.reference_code_used}
                  </Badge>
                )}
                {isInfoRequested && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    Awaiting Info
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-2">
                {request.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {request.email}
                  </span>
                )}
                {request.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {request.phone}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {timeAgo(request.created_at)}
                </span>
              </div>

              {request.message && (
                <div className="p-2 bg-muted rounded text-sm mb-3">
                  <p className="italic">"{request.message}"</p>
                </div>
              )}

              {/* Actions */}
              {(isPending || isInfoRequested) && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => setShowApproveDialog(true)}
                    className="gap-1"
                  >
                    <Check className="w-3 h-3" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowRejectDialog(true)}
                    className="gap-1"
                  >
                    <X className="w-3 h-3" />
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowRequestInfoDialog(true)}
                    className="gap-1"
                  >
                    <HelpCircle className="w-3 h-3" />
                    Request Info
                  </Button>
                  {request.email && (
                    <Button
                      size="sm"
                      variant="ghost"
                      asChild
                      className="gap-1"
                    >
                      <a href={`mailto:${request.email}`}>
                        <MessageSquare className="w-3 h-3" />
                        Contact
                      </a>
                    </Button>
                  )}
                </div>
              )}

              {/* Show status for non-pending with reviewer info */}
              {request.status === "approved" && (
                <div className="space-y-1">
                  <Badge className="bg-primary">
                    <Check className="w-3 h-3 mr-1" />
                    Approved
                  </Badge>
                  {request.reviewer && request.reviewed_at && (
                    <p className="text-xs text-muted-foreground">
                      by {request.reviewer.full_name} on {new Date(request.reviewed_at).toLocaleDateString()}
                    </p>
                  )}
                  {request.welcome_message && (
                    <p className="text-xs text-muted-foreground italic">
                      "{request.welcome_message}"
                    </p>
                  )}
                </div>
              )}
              {request.status === "rejected" && (
                <div className="space-y-1">
                  <Badge variant="destructive">
                    <X className="w-3 h-3 mr-1" />
                    Declined
                  </Badge>
                  {request.reviewer && request.reviewed_at && (
                    <p className="text-xs text-muted-foreground">
                      by {request.reviewer.full_name} on {new Date(request.reviewed_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approve Dialog with Welcome Message */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PartyPopper className="w-5 h-5 text-primary" />
              Welcome {request.full_name}!
            </DialogTitle>
            <DialogDescription>
              Add a personalized welcome message (optional). They'll receive this when approved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Preview of what they'll see:</p>
              <div className="p-3 bg-background rounded border">
                <p className="text-sm text-muted-foreground">
                  "Welcome to the family! {welcomeMessage || "We're excited to have you join us."}"
                </p>
              </div>
            </div>
            <Textarea
              placeholder="Write a personal welcome note... (e.g., 'Welcome! We're thrilled to have you. Our next meeting is on Saturday!')"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={processing}>
              {processing ? "Approving..." : "Approve & Send Welcome"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog with Polite Explanation */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Join Request</DialogTitle>
            <DialogDescription>
              Provide a polite explanation (optional). They'll receive a gentle notification.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                💡 Tip: Keep it polite and constructive. Example reasons:
              </p>
              <ul className="text-xs text-amber-700 dark:text-amber-300 mt-2 space-y-1 list-disc list-inside">
                <li>We're not accepting new members at this time</li>
                <li>Please contact us directly to discuss membership</li>
                <li>Try using a valid invitation code from a member</li>
              </ul>
            </div>
            <Textarea
              placeholder="Optional: Add a reason (they'll receive a polite notification)"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing}>
              {processing ? "Declining..." : "Decline Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request More Info Dialog */}
      <Dialog open={showRequestInfoDialog} onOpenChange={setShowRequestInfoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request More Information</DialogTitle>
            <DialogDescription>
              Ask {request.full_name} for additional details before making a decision.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="What information do you need? (e.g., 'Please provide your relation to the family' or 'Which family member referred you?')"
            value={infoRequest}
            onChange={(e) => setInfoRequest(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestInfoDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRequestInfo} disabled={processing || !infoRequest.trim()}>
              {processing ? "Sending..." : "Send Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

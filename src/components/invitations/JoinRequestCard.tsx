import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Check, X, MessageSquare, Clock, User, Mail, Phone } from "lucide-react";

interface JoinRequest {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  message?: string;
  status: string;
  reference_code_used?: string;
  created_at: string;
  user_id?: string;
  profiles?: {
    avatar_url?: string;
    full_name: string;
  };
}

interface JoinRequestCardProps {
  request: JoinRequest;
  onApprove: (id: string, welcomeMessage?: string) => Promise<void>;
  onReject: (id: string, reason?: string) => Promise<void>;
}

export const JoinRequestCard = ({ request, onApprove, onReject }: JoinRequestCardProps) => {
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
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
              <div className="flex gap-2">
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Join Request</DialogTitle>
            <DialogDescription>
              Add a welcome message for {request.full_name} (optional)
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Welcome to the family! We're excited to have you..."
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={processing}>
              {processing ? "Approving..." : "Approve & Add to Family"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Join Request</DialogTitle>
            <DialogDescription>
              Optionally provide a reason (they will receive a polite notification)
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="We're currently not accepting new members..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={3}
          />
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
    </>
  );
};

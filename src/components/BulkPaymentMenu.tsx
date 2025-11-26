import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { contributionSchema } from "@/lib/validation";
import { z } from "zod";

interface Member {
  id: string;
  profiles: {
    full_name: string;
  } | null;
}

interface BulkPaymentMenuProps {
  members: Member[];
  familyId: string;
  contributionDate: string;
  onSuccess: () => void;
}

export default function BulkPaymentMenu({ members, familyId, contributionDate, onSuccess }: BulkPaymentMenuProps) {
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const toggleMember = (memberId: string) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedMembers(newSelected);
  };

  const toggleAll = () => {
    if (selectedMembers.size === members.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(members.map(m => m.id)));
    }
  };

  const handleBulkPayment = async () => {
    if (selectedMembers.size === 0) {
      toast({
        title: "No members selected",
        description: "Please select at least one member",
        variant: "destructive",
      });
      return;
    }

    // Validate the number of selected members to prevent abuse
    if (selectedMembers.size > 100) {
      toast({
        title: "Too many selections",
        description: "Please select up to 100 members at a time",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const payments = Array.from(selectedMembers).map(memberId => ({
        memberId,
        amount: 25000,
        contributionDate: contributionDate,
        type: "monthly" as const,
        notes: undefined,
      }));

      // Validate all payments before submitting
      const validationErrors: string[] = [];
      payments.forEach((payment, index) => {
        const result = contributionSchema.safeParse(payment);
        if (!result.success) {
          validationErrors.push(`Payment ${index + 1}: ${result.error.errors[0].message}`);
        }
      });

      if (validationErrors.length > 0) {
        toast({
          title: "Validation Error",
          description: validationErrors.join(", "),
          variant: "destructive",
        });
        return;
      }

      // Insert validated payments
      const insertPayments = payments.map(p => ({
        family_id: familyId,
        member_id: p.memberId,
        amount: p.amount,
        contribution_date: p.contributionDate,
        payment_date: new Date().toISOString(),
        status: 'paid',
        type: p.type,
      }));

      const { error } = await supabase
        .from('contributions')
        .insert(insertPayments);

      if (error) throw error;

      toast({
        title: "Payments recorded",
        description: `Successfully recorded ${selectedMembers.size} payment(s)`,
      });

      setSelectedMembers(new Set());
      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error('Error recording bulk payments:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to record payments",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <CheckCircle className="mr-2 h-4 w-4" />
          Bulk Payment Recording
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Payment Recording</DialogTitle>
          <DialogDescription>
            Select members to mark their contributions as paid
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={selectedMembers.size === members.length}
                onCheckedChange={toggleAll}
              />
              <label className="text-sm font-medium">Select All ({members.length})</label>
            </div>
            <Badge variant="secondary">
              {selectedMembers.size} selected
            </Badge>
          </div>

          <div className="space-y-2">
            {members.map((member) => (
              <Card key={member.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={selectedMembers.has(member.id)}
                      onCheckedChange={() => toggleMember(member.id)}
                    />
                    <div>
                      <p className="font-medium">{member.profiles?.full_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">
                        Amount: {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'XAF',
                          minimumFractionDigits: 0,
                        }).format(25000)}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleBulkPayment} disabled={isProcessing || selectedMembers.size === 0}>
              {isProcessing ? "Processing..." : `Record ${selectedMembers.size} Payment(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface OutstandingLoan {
  id: string;
  amount: number;
  amount_paid: number;
  interest_paid: number;
  interest_rate: number;
  term_months: number;
  purpose: string;
}

interface LoanDeductionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  payoutAmount: number;
  payoutType: "njangi" | "assistance";
  onConfirm: (deductionAmount: number, remainingPayout: number) => void;
}

export function LoanDeductionDialog({
  open,
  onOpenChange,
  memberId,
  payoutAmount,
  payoutType,
  onConfirm,
}: LoanDeductionDialogProps) {
  const [loading, setLoading] = useState(true);
  const [loans, setLoans] = useState<OutstandingLoan[]>([]);

  useEffect(() => {
    if (open && memberId) {
      loadOutstandingLoans();
    }
  }, [open, memberId]);

  const loadOutstandingLoans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("loans")
        .select("*")
        .eq("member_id", memberId)
        .in("status", ["approved", "disbursed"])
        .order("created_at", { ascending: true });

      if (error) throw error;
      setLoans(data || []);
    } catch (error) {
      console.error("Error loading loans:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateOutstanding = (loan: OutstandingLoan) => {
    const totalInterest = (loan.amount * loan.interest_rate * loan.term_months) / 100;
    const totalOwed = loan.amount + totalInterest;
    const totalPaid = (loan.amount_paid || 0) + (loan.interest_paid || 0);
    return totalOwed - totalPaid;
  };

  const totalOutstanding = loans.reduce((sum, loan) => sum + calculateOutstanding(loan), 0);
  const deductionAmount = Math.min(totalOutstanding, payoutAmount);
  const remainingPayout = payoutAmount - deductionAmount;

  const handleConfirm = () => {
    onConfirm(deductionAmount, remainingPayout);
    onOpenChange(false);
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Checking Outstanding Loans</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        </DialogContent>
      </Dialog>
    );
  }

  if (loans.length === 0) {
    // No outstanding loans, proceed with full payout
    handleConfirm();
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Outstanding Loans Detected</DialogTitle>
          <DialogDescription>
            This member has outstanding loans. According to family policy, loan repayments will be automatically deducted from this {payoutType} payout.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="default" className="border-orange-500">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <AlertDescription>
            <strong>Loan Surety System Active</strong>
            <p className="mt-1 text-sm">
              Unpaid loans will be recovered from {payoutType === "njangi" ? "Njangi" : "assistance"} payments as per family policy.
            </p>
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Outstanding Loans:</h4>
            <div className="border rounded-lg divide-y">
              {loans.map((loan) => {
                const outstanding = calculateOutstanding(loan);
                return (
                  <div key={loan.id} className="p-3 flex justify-between items-center">
                    <div>
                      <div className="font-medium">{loan.purpose}</div>
                      <div className="text-sm text-muted-foreground">
                        Principal: {loan.amount.toLocaleString()} FCFA @ {loan.interest_rate}% for {loan.term_months} months
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-orange-600">
                        {outstanding.toLocaleString()} FCFA
                      </div>
                      <div className="text-xs text-muted-foreground">outstanding</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Original Payout:</span>
              <span className="font-mono">{payoutAmount.toLocaleString()} FCFA</span>
            </div>
            <div className="flex justify-between text-sm text-orange-600">
              <span>Loan Deduction:</span>
              <span className="font-mono">-{deductionAmount.toLocaleString()} FCFA</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Net Payout:</span>
              <span className="font-mono">{remainingPayout.toLocaleString()} FCFA</span>
            </div>
          </div>

          {remainingPayout < 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                The outstanding loan amount exceeds the payout. The entire payout will be applied to the loan balance.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Confirm Payout with Deduction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

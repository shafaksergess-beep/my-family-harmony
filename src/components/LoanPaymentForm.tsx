import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface LoanPaymentFormProps {
  loan: any;
  onSuccess: () => void;
  totalOwed: number;
  totalPaid: number;
  remaining: number;
}

export function LoanPaymentForm({ loan, onSuccess, totalOwed, totalPaid, remaining }: LoanPaymentFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [paymentType, setPaymentType] = useState<"principal" | "interest" | "both">("both");
  const [principalAmount, setPrincipalAmount] = useState("");
  const [interestAmount, setInterestAmount] = useState("");
  const [notes, setNotes] = useState("");

  const principalRemaining = loan.amount - (loan.amount_paid || 0);
  const interestRemaining = (loan.amount * loan.interest_rate * loan.term_months) / 100 - (loan.interest_paid || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const principal = paymentType === "interest" ? 0 : parseFloat(principalAmount || "0");
      const interest = paymentType === "principal" ? 0 : parseFloat(interestAmount || "0");

      if (principal < 0 || interest < 0) {
        throw new Error("Payment amounts cannot be negative");
      }

      if (principal > principalRemaining) {
        throw new Error(`Principal payment cannot exceed remaining principal of ${principalRemaining.toLocaleString()} FCFA`);
      }

      if (interest > interestRemaining) {
        throw new Error(`Interest payment cannot exceed remaining interest of ${interestRemaining.toLocaleString()} FCFA`);
      }

      const newPrincipalPaid = (loan.amount_paid || 0) + principal;
      const newInterestPaid = (loan.interest_paid || 0) + interest;
      const newTotalPaid = newPrincipalPaid + newInterestPaid;

      // Check if loan is fully paid
      const isFullyPaid = newTotalPaid >= totalOwed;

      const { error } = await supabase
        .from("loans")
        .update({
          amount_paid: newPrincipalPaid,
          interest_paid: newInterestPaid,
          status: isFullyPaid ? "repaid" : loan.status,
          notes: notes ? `${loan.notes || ""}\n\nPayment recorded: ${principal.toLocaleString()} FCFA principal + ${interest.toLocaleString()} FCFA interest. ${notes}` : loan.notes,
        })
        .eq("id", loan.id);

      if (error) throw error;

      toast({
        title: isFullyPaid ? "Loan Fully Repaid!" : "Payment Recorded",
        description: `Recorded ${(principal + interest).toLocaleString()} FCFA payment${isFullyPaid ? ". Loan is now fully repaid." : "."}`,
      });

      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 bg-muted rounded space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Total Owed:</span>
          <span className="font-bold">{totalOwed.toLocaleString()} FCFA</span>
        </div>
        <div className="flex justify-between">
          <span>Total Paid:</span>
          <span className="font-medium text-green-600">{totalPaid.toLocaleString()} FCFA</span>
        </div>
        <div className="flex justify-between border-t pt-2">
          <span>Remaining:</span>
          <span className="font-bold text-orange-600">{remaining.toLocaleString()} FCFA</span>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
          <div>
            <span className="text-muted-foreground">Principal remaining:</span>
            <p className="font-medium">{principalRemaining.toLocaleString()} FCFA</p>
          </div>
          <div>
            <span className="text-muted-foreground">Interest remaining:</span>
            <p className="font-medium">{interestRemaining.toLocaleString()} FCFA</p>
          </div>
        </div>
      </div>

      <div>
        <Label>Payment Type</Label>
        <RadioGroup value={paymentType} onValueChange={(value: any) => setPaymentType(value)} className="mt-2">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="both" id="both" />
            <Label htmlFor="both">Principal + Interest</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="principal" id="principal" />
            <Label htmlFor="principal">Principal Only</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="interest" id="interest" />
            <Label htmlFor="interest">Interest Only</Label>
          </div>
        </RadioGroup>
      </div>

      {paymentType !== "interest" && (
        <div>
          <Label htmlFor="principal">Principal Payment (FCFA)</Label>
          <Input
            id="principal"
            type="number"
            min="0"
            max={principalRemaining}
            step="1000"
            value={principalAmount}
            onChange={(e) => setPrincipalAmount(e.target.value)}
            placeholder="0"
            required
          />
          <p className="text-xs text-muted-foreground mt-1">
            Max: {principalRemaining.toLocaleString()} FCFA
          </p>
        </div>
      )}

      {paymentType !== "principal" && (
        <div>
          <Label htmlFor="interest">Interest Payment (FCFA)</Label>
          <Input
            id="interest"
            type="number"
            min="0"
            max={interestRemaining}
            step="1000"
            value={interestAmount}
            onChange={(e) => setInterestAmount(e.target.value)}
            placeholder="0"
            required
          />
          <p className="text-xs text-muted-foreground mt-1">
            Max: {interestRemaining.toLocaleString()} FCFA
          </p>
        </div>
      )}

      <div>
        <Label htmlFor="notes">Payment Notes (Optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any notes about this payment..."
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Recording..." : "Record Payment"}
      </Button>
    </form>
  );
}

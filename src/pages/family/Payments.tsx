import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, CheckCircle, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useCurrency } from "@/context/CurrencyContext";
import { CurrencySelector } from "@/components/CurrencySelector";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PaymentTransaction {
  id: string;
  amount: number;
  payment_method: string;
  payment_reference: string;
  status: string;
  transaction_date: string;
  verified_at: string;
  notes: string;
  family_members: {
    profiles: { full_name: string };
  };
}

const Payments = () => {
  const { t } = useTranslation();
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { family, canManageFinances, isLoading, userId } = useFamilyAuth(familySlug);
  const { toast } = useToast();
  const { formatAmount } = useCurrency();
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [members, setMembers] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    member_id: "",
    amount: "",
    payment_method: "mobile_money",
    payment_reference: "",
    notes: "",
  });


  const loadData = useCallback(async () => {
    if (!family) return;

    try {
      // Load payments with member info
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payment_transactions")
        .select("*")
        .eq("family_id", family.id)
        .order("transaction_date", { ascending: false });

      if (paymentsError) throw paymentsError;

      // Fetch member details separately
      if (paymentsData && paymentsData.length > 0) {
        const memberIds = [...new Set(paymentsData.map(p => p.member_id))];
        const { data: membersData } = await supabase
          .from("family_members")
          .select("id, profiles:user_id(full_name)")
          .in("id", memberIds);

        const membersMap = new Map(membersData?.map(m => [m.id, m]) || []);
        
        const enrichedPayments = paymentsData.map(payment => ({
          ...payment,
          family_members: membersMap.get(payment.member_id) || { profiles: { full_name: "Unknown" } }
        })) as unknown as PaymentTransaction[];

        setPayments(enrichedPayments);
      } else {
        setPayments([]);
      }

      // Load family members
      const { data: membersData, error: membersError } = await supabase
        .from("family_members")
        .select("id, profiles:user_id(full_name)")
        .eq("family_id", family.id);

      if (membersError) throw membersError;
      setMembers(membersData || []);
    } catch (error) {
      console.error("Error loading payments:", error);
      toast({
        title: t("famPayments.error"),
        description: t("famPayments.failedToLoadPaymentData"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [family, toast]);

  useEffect(() => {
    if (family) {
      loadData();
    }
  }, [family, loadData]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!family || !canManageFinances) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("payment_transactions").insert({
        family_id: family.id,
        member_id: formData.member_id,
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        payment_reference: formData.payment_reference,
        status: "completed",
        verified_by: userId,
        verified_at: new Date().toISOString(),
        notes: formData.notes,
      });

      if (error) throw error;

      toast({
        title: t("famPayments.paymentRecorded"),
        description: t("famPayments.paymentHasBeenSuccessfullyRecorded"),
      });

      setFormData({
        member_id: "",
        amount: "",
        payment_method: "mobile_money",
        payment_reference: "",
        notes: "",
      });
      setDialogOpen(false);
      loadData();
    } catch (error) {
      const err = error as Error;
      console.error("Error recording payment:", err);
      toast({
        title: t("famPayments.error"),
        description: err.message || "Failed to record payment",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            {t("famPayments.completed")}
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline">
            <Clock className="w-3 h-3 mr-1" />
            {t("famPayments.pending")}
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            {t("famPayments.failed")}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading || loading) {
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
              <Button variant="ghost" onClick={() => navigate(`/family/${familySlug}`)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("famPayments.back")}
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t("famPayments.paymentManagement")}</h1>
                <p className="text-sm text-muted-foreground">{t("famPayments.trackAndManageMemberPayments")}</p>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <LanguageSwitcher />
              <CurrencySelector />
              {canManageFinances && (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>{t("famPayments.recordPayment")}</Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("famPayments.recordPayment")}</DialogTitle>
                    <DialogDescription>{t("famPayments.recordANewPaymentTransaction")}</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleRecordPayment} className="space-y-4">
                    <div>
                      <Label htmlFor="member">{t("famPayments.member")}</Label>
                      <Select
                        value={formData.member_id}
                        onValueChange={(value) => setFormData({ ...formData, member_id: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("famPayments.selectMember")} />
                        </SelectTrigger>
                        <SelectContent>
                          {members.map((member) => (
                            <SelectItem key={String(member.id)} value={String(member.id)}>
                              {(member.profiles as { full_name: string })?.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="amount">{t("famPayments.amount")}</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="method">{t("famPayments.paymentMethod")}</Label>
                      <Select
                        value={formData.payment_method}
                        onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mobile_money">{t("famPayments.mobileMoney")}</SelectItem>
                          <SelectItem value="bank_transfer">{t("famPayments.bankTransfer")}</SelectItem>
                          <SelectItem value="cash">{t("famPayments.cash")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="reference">{t("famPayments.paymentReference")}</Label>
                      <Input
                        id="reference"
                        value={formData.payment_reference}
                        onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })}
                        placeholder={t("famPayments.transactionIdOrReference")}
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes">{t("famPayments.notes")}</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder={t("famPayments.additionalNotes")}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t("famPayments.recording")}
                        </>
                      ) : (
                        "Record Payment"
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>{t("famPayments.paymentTransactions")}</CardTitle>
            <CardDescription>{t("famPayments.viewAllPaymentTransactionsFor")}</CardDescription>
          </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-8 space-y-4">
                  <p className="text-muted-foreground">{t("famPayments.noPaymentsRecordedYet")}</p>
                  <Button variant="outline" onClick={() => navigate(`/family/${familySlug}/payment-integration`)}>
                    {t("famPayments.setUpMobileMoneyIntegration")}
                  </Button>
                </div>
              ) : (
              <div className="space-y-4">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{payment.family_members?.profiles?.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Amount: {formatAmount(payment.amount)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Method: {payment.payment_method.replace("_", " ").toUpperCase()}
                      </p>
                      {payment.payment_reference && (
                        <p className="text-xs text-muted-foreground">Ref: {payment.payment_reference}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(payment.transaction_date).toLocaleString()}
                      </p>
                    </div>
                    <div>{getStatusBadge(payment.status)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Payments;

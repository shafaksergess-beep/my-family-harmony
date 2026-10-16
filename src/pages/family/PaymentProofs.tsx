import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, ArrowLeft, Copy, Loader2, ShieldCheck, Upload } from "lucide-react";

type Provider = "mtn" | "orange";
interface Proof {
  id: string; family_id: string; member_id: string; submitted_by: string; provider: Provider; category: string;
  reason: string; claimed_amount: number; claimed_reference: string | null; image_path: string;
  ai_extracted: Record<string, unknown> | null; ai_status: string; amount_mismatch: boolean; duplicate_of: string | null;
  requires_dual_review: boolean; status: string; first_reviewer: string | null; rejection_reason: string | null; created_at: string;
}

const CATEGORIES: Record<string, string> = {
  contribution: "Monthly contribution", fine: "Fine", levy: "House levy", loan_repayment: "Loan repayment",
  savings: "Savings deposit", savings_withdrawal: "Savings withdrawal", other: "Other",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Pending review", partially_approved: "Awaiting 2nd approval", approved: "Approved", rejected: "Rejected",
};

const PaymentProofs = () => {
  const { t } = useTranslation();
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { family, memberId, userId, isLoading, isFamilyHead, isFamilyAdmin, isTreasurer, isSuperAdmin } = useFamilyAuth(familySlug);
  const isReviewer = isFamilyHead || isFamilyAdmin || isTreasurer || isSuperAdmin;
  const fam = family as unknown as Record<string, string | null> | null;

  const [proofs, setProofs] = useState<Proof[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [provider, setProvider] = useState<Provider | null>(null);
  const [form, setForm] = useState({ category: "contribution", amount: "", reference: "", reason: "" });
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState<Proof | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!family) return;
    const { data } = await supabase.from("payment_proofs").select("*").eq("family_id", family.id).order("created_at", { ascending: false });
    const rows = (data ?? []) as unknown as Proof[];
    setProofs(rows);
    const ids = [...new Set(rows.map((r) => r.submitted_by))];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      setNames(Object.fromEntries((profs ?? []).map((p) => [p.id, p.full_name])));
    }
  }, [family]);
  useEffect(() => { load(); }, [load]);

  const methods = [
    { id: "mtn" as Provider, name: "MTN Mobile Money", ussd: "*126#", number: fam?.momo_mtn_number, holder: fam?.momo_mtn_name, cls: "bg-[hsl(48_96%_53%)] text-foreground" },
    { id: "orange" as Provider, name: "Orange Money", ussd: "#150#", number: fam?.momo_orange_number, holder: fam?.momo_orange_name, cls: "bg-[hsl(25_95%_53%)] text-primary-foreground" },
  ];

  const copy = (txt: string) => { navigator.clipboard.writeText(txt); toast({ title: t("famPaymentProofs.copied") }); };

  const submit = async () => {
    if (!family || !memberId || !userId || !provider || !file) return;
    const amount = Number(form.amount);
    if (!amount || amount <= 0 || form.reason.trim().length < 3) {
      toast({ title: t("famPaymentProofs.enterTheAmountAndA"), variant: "destructive" }); return;
    }
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
      toast({ title: t("famPaymentProofs.uploadAClearImageUnder"), variant: "destructive" }); return;
    }
    setSubmitting(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${family.id}/${userId}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("payment-proofs").upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      const { data, error } = await supabase.from("payment_proofs").insert({
        family_id: family.id, member_id: memberId, submitted_by: userId, provider, category: form.category,
        reason: form.reason.trim(), claimed_amount: amount, claimed_reference: form.reference.trim() || null, image_path: path,
      }).select("id").single();
      if (error) throw error.code === "23505" ? new Error("This transaction reference was already submitted") : error;
      toast({ title: t("famPaymentProofs.proofSubmitted"), description: t("famPaymentProofs.readingYourReceipt") });
      const ai = await supabase.functions.invoke("extract-payment-proof", { body: { proof_id: data.id } });
      if (ai.error) toast({ title: t("famPaymentProofs.receiptCouldNotBeRead"), description: t("famPaymentProofs.reviewersWillCheckItManually") });
      else if (ai.data?.amount_mismatch) toast({ title: t("famPaymentProofs.amountOnReceiptDiffersFrom"), description: t("famPaymentProofs.reviewersWillBeAlerted"), variant: "destructive" });
      setProvider(null); setFile(null); setForm({ category: "contribution", amount: "", reference: "", reason: "" });
      load();
    } catch (e) {
      toast({ title: t("famPaymentProofs.submissionFailed"), description: (e as Error).message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const openProof = async (p: Proof) => {
    setOpen(p); setNotes(""); setImgUrl(null);
    const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(p.image_path, 300);
    setImgUrl(data?.signedUrl ?? null);
  };

  const review = async (decision: "approve" | "reject") => {
    if (!open) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("review_payment_proof", { p_proof_id: open.id, p_decision: decision, p_notes: notes || null });
    setBusy(false);
    if (error) { toast({ title: t("famPaymentProofs.actionFailed"), description: error.message, variant: "destructive" }); return; }
    toast({ title: data === "partially_approved" ? "First approval recorded — a second reviewer must confirm" : `Payment ${data}` });
    setOpen(null); load();
  };

  const rescan = async () => {
    if (!open) return;
    setBusy(true);
    const r = await supabase.functions.invoke("extract-payment-proof", { body: { proof_id: open.id } });
    setBusy(false);
    if (r.error) toast({ title: t("famPaymentProofs.scanFailed"), variant: "destructive" });
    else { await load(); setOpen({ ...open, ai_extracted: r.data.extracted, amount_mismatch: r.data.amount_mismatch, duplicate_of: r.data.duplicate_of, ai_status: "done" }); }
  };

  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const mine = proofs.filter((p) => p.submitted_by === userId);
  const queue = (s: string) => proofs.filter((p) => p.status === s);
  const ProofRow = ({ p }: { p: Proof }) => (
    <button onClick={() => openProof(p)} className="flex w-full items-center justify-between rounded-lg border p-3 text-left hover:bg-muted/50">
      <div>
        <div className="font-medium">{Number(p.claimed_amount).toLocaleString()} FCFA · {p.provider.toUpperCase()}</div>
        <div className="text-sm text-muted-foreground">{names[p.submitted_by] ?? "Member"} · {CATEGORIES[p.category]} · {new Date(p.created_at).toLocaleDateString()}</div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <Badge variant={p.status === "approved" ? "default" : p.status === "rejected" ? "destructive" : "secondary"}>{STATUS_LABEL[p.status]}</Badge>
        {(p.amount_mismatch || p.duplicate_of) && <span className="flex items-center gap-1 text-xs text-destructive"><AlertTriangle className="h-3 w-3" />{t("famPaymentProofs.check")}</span>}
        {p.requires_dual_review && <span className="text-xs text-muted-foreground">2 reviewers</span>}
      </div>
    </button>
  );

  const ex = open?.ai_extracted ?? {};
  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-4">
      <Button variant="ghost" onClick={() => navigate(`/family/${familySlug}`)}><ArrowLeft className="mr-2 h-4 w-4" />{t("famPaymentProofs.back")}</Button>
      <div>
        <h1 className="text-2xl font-bold">{t("famPaymentProofs.mobileMoneyPayments")}</h1>
        <p className="text-muted-foreground">{t("famPaymentProofs.payWithMtnOrOrange")}</p>
      </div>

      <Tabs defaultValue="pay">
        <TabsList className="flex w-full overflow-x-auto">
          <TabsTrigger value="pay">{t("famPaymentProofs.pay")}</TabsTrigger>
          <TabsTrigger value="mine">My submissions ({mine.length})</TabsTrigger>
          {isReviewer && <TabsTrigger value="review">Review ({queue("pending").length + queue("partially_approved").length})</TabsTrigger>}
        </TabsList>

        <TabsContent value="pay" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {methods.map((m) => (
              <Card key={m.id} className={provider === m.id ? "ring-2 ring-primary" : ""}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold ${m.cls}`}>{m.id === "mtn" ? "MTN" : "OM"}</div>
                    <div><CardTitle className="text-lg">{m.name}</CardTitle><CardDescription>Dial {m.ussd}</CardDescription></div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {m.number ? (
                    <div className="flex items-center justify-between rounded-md bg-muted p-2">
                      <div><div className="font-mono text-base">{m.number}</div><div className="text-muted-foreground">{m.holder}</div></div>
                      <Button size="icon" variant="ghost" aria-label={t("famPaymentProofs.copyNumber")} onClick={() => copy(m.number!)}><Copy className="h-4 w-4" /></Button>
                    </div>
                  ) : <p className="text-muted-foreground">{t("famPaymentProofs.theTreasurerHasNotSet")}</p>}
                  <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                    <li>Dial {m.ussd} and choose Transfer / Send money</li>
                    <li>{t("famPaymentProofs.enterTheNumberAboveAnd")}</li>
                    <li>{t("famPaymentProofs.writeYourNameReasonAs")}</li>
                    <li>{t("famPaymentProofs.confirmWithYourPinAnd")}</li>
                  </ol>
                  <Button className="w-full" disabled={!m.number} onClick={() => setProvider(m.id)}>{t("famPaymentProofs.iHavePaidUploadProof")}</Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {provider && (
            <Card>
              <CardHeader><CardTitle>Proof of payment ({provider.toUpperCase()})</CardTitle>
                <CardDescription>{t("famPaymentProofs.uploadAClearPhotoOr")}</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div><Label>{t("famPaymentProofs.reasonForPayment")}</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div><Label>Amount sent (FCFA)</Label><Input type="number" inputMode="numeric" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                  <div><Label>Transaction ID (optional)</Label><Input value={form.reference} maxLength={64} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
                  <div><Label>{t("famPaymentProofs.receiptImage")}</Label><Input type="file" accept="image/*" capture="environment" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
                </div>
                <div><Label>{t("famPaymentProofs.details")}</Label><Textarea maxLength={500} placeholder="e.g. October 2026 contribution" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
                {Number(form.amount) >= Number(fam?.payment_dual_review_threshold ?? 100000) || ["loan_repayment", "savings", "savings_withdrawal"].includes(form.category)
                  ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4" />{t("famPaymentProofs.thisPaymentNeedsApprovalFrom")}</p> : null}
                <div className="flex gap-2">
                  <Button onClick={submit} disabled={submitting || !file}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Submit proof</Button>
                  <Button variant="outline" onClick={() => setProvider(null)}>{t("famPaymentProofs.cancel")}</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="mine" className="space-y-2">
          {mine.length === 0 ? <p className="text-muted-foreground">{t("famPaymentProofs.noSubmissionsYet")}</p> : mine.map((p) => <ProofRow key={p.id} p={p} />)}
        </TabsContent>

        {isReviewer && (
          <TabsContent value="review" className="space-y-4">
            {(isFamilyHead || isFamilyAdmin || isTreasurer) && <MomoSettings familyId={family!.id} initial={fam} onSaved={() => window.location.reload()} />}
            {(["pending", "partially_approved", "approved", "rejected"] as const).map((s) => (
              <div key={s} className="space-y-2">
                <h3 className="font-semibold">{STATUS_LABEL[s]} ({queue(s).length})</h3>
                {queue(s).slice(0, s === "approved" || s === "rejected" ? 10 : 100).map((p) => <ProofRow key={p.id} p={p} />)}
              </div>
            ))}
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          {open && (<>
            <DialogHeader>
              <DialogTitle>{Number(open.claimed_amount).toLocaleString()} FCFA · {open.provider.toUpperCase()}</DialogTitle>
              <DialogDescription>{names[open.submitted_by]} · {CATEGORIES[open.category]} · {STATUS_LABEL[open.status]}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 md:grid-cols-2">
              <a href={imgUrl ?? "#"} target="_blank" rel="noreferrer" className="block rounded-lg border bg-muted">
                {imgUrl ? <img src={imgUrl} alt={t("famPaymentProofs.paymentReceipt")} className="max-h-[60vh] w-full object-contain" /> : <div className="p-8 text-center"><Loader2 className="mx-auto animate-spin" /></div>}
              </a>
              <div className="space-y-3 text-sm">
                {open.duplicate_of && <p className="rounded bg-destructive/10 p-2 text-destructive">{t("famPaymentProofs.possibleDuplicateThisTransactionId")}</p>}
                {open.amount_mismatch && <p className="rounded bg-destructive/10 p-2 text-destructive">{t("famPaymentProofs.amountOnReceiptDoesNot")}</p>}
                <table className="w-full">
                  <thead><tr className="text-left text-muted-foreground"><th>{t("famPaymentProofs.field")}</th><th>{t("famPaymentProofs.memberSays")}</th><th>Receipt (AI)</th></tr></thead>
                  <tbody>
                    <tr><td>{t("famPaymentProofs.amount")}</td><td>{Number(open.claimed_amount).toLocaleString()}</td><td className={open.amount_mismatch ? "text-destructive font-semibold" : ""}>{String(ex.amount ?? "—")}</td></tr>
                    <tr><td>{t("famPaymentProofs.provider")}</td><td>{open.provider.toUpperCase()}</td><td>{String(ex.provider ?? "—")}</td></tr>
                    <tr><td>{t("famPaymentProofs.reference")}</td><td>{open.claimed_reference ?? "—"}</td><td>{String(ex.transaction_reference ?? "—")}</td></tr>
                    <tr><td>{t("famPaymentProofs.date")}</td><td>{new Date(open.created_at).toLocaleString()}</td><td>{String(ex.transaction_date ?? "—")}</td></tr>
                    <tr><td>{t("famPaymentProofs.sender")}</td><td>{names[open.submitted_by]}</td><td>{[ex.sender_name, ex.sender_phone].filter(Boolean).join(" · ") || "—"}</td></tr>
                    <tr><td>{t("famPaymentProofs.recipient")}</td><td>—</td><td>{[ex.recipient_name, ex.recipient_phone].filter(Boolean).join(" · ") || "—"}</td></tr>
                    <tr><td>{t("famPaymentProofs.confidence")}</td><td></td><td>{ex.confidence != null ? `${Math.round(Number(ex.confidence) * 100)}%` : open.ai_status}</td></tr>
                  </tbody>
                </table>
                <p><span className="text-muted-foreground">{t("famPaymentProofs.details")}</span> {open.reason}</p>
                {open.rejection_reason && <p className="text-destructive">{t("mtgUi.Rejected")} {open.rejection_reason}</p>}
                <p className="text-xs text-muted-foreground">{t("famPaymentProofs.aiReadsTheScreenshotOnly")}</p>
                {isReviewer && open.submitted_by !== userId && ["pending", "partially_approved"].includes(open.status) && (
                  <div className="space-y-2 border-t pt-3">
                    {open.requires_dual_review && <p className="text-muted-foreground">{open.status === "pending" ? t("mtgUi.Requires_2_approvals_yours_will_be_the_first") : open.first_reviewer === userId ? t("mtgUi.You_gave_the_first_approval_another_reviewer_must_") : t("mtgUi.Your_approval_will_finalize_this_payment")}</p>}
                    <Textarea placeholder={t("mtgUi.Notes_required_to_reject")} value={notes} onChange={(e) => setNotes(e.target.value)} />
                    <div className="flex flex-wrap gap-2">
                      <Button disabled={busy || open.first_reviewer === userId} onClick={() => review("approve")}>{t("famPaymentProofs.approve")}</Button>
                      <Button variant="destructive" disabled={busy} onClick={() => review("reject")}>{t("famPaymentProofs.reject")}</Button>
                      <Button variant="outline" disabled={busy} onClick={rescan}>{t("famPaymentProofs.reScanReceipt")}</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>)}
        </DialogContent>
      </Dialog>
    </div>
  );
};

function MomoSettings({ familyId, initial, onSaved }: { familyId: string; initial: Record<string, string | null> | null; onSaved: () => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [v, setV] = useState({
    momo_mtn_number: initial?.momo_mtn_number ?? "", momo_mtn_name: initial?.momo_mtn_name ?? "",
    momo_orange_number: initial?.momo_orange_number ?? "", momo_orange_name: initial?.momo_orange_name ?? "",
    payment_dual_review_threshold: String(initial?.payment_dual_review_threshold ?? "100000"),
  });
  const save = async () => {
    const { error } = await supabase.from("families").update({ ...v, payment_dual_review_threshold: Number(v.payment_dual_review_threshold) || 100000 }).eq("id", familyId);
    if (error) toast({ title: t("famPaymentProofs.couldNotSave"), description: error.message, variant: "destructive" });
    else { toast({ title: t("famPaymentProofs.paymentDetailsSaved") }); onSaved(); }
  };
  const f = (k: keyof typeof v, label: string) => (
    <div><Label>{label}</Label><Input value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></div>
  );
  return (
    <Card><CardHeader><CardTitle className="text-base">{t("famPaymentProofs.familyReceivingAccounts")}</CardTitle>
      <CardDescription>{t("famPaymentProofs.shownToMembersOnThe")}</CardDescription></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {f("momo_mtn_number", "MTN number")}{f("momo_mtn_name", "MTN account name")}
        {f("momo_orange_number", "Orange number")}{f("momo_orange_name", "Orange account name")}
        {f("payment_dual_review_threshold", "High-value threshold (FCFA, needs 2 reviewers)")}
        <div className="flex items-end"><Button onClick={save}>{t("famPaymentProofs.save")}</Button></div>
      </CardContent></Card>
  );
}

export default PaymentProofs;

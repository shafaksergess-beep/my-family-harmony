import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRecaptcha } from "@/hooks/useRecaptcha";

interface Props {
  familyId: string;
  defaultRole?: string;
  expirationDays?: number;
  onSent?: () => void;
}

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const generateRefCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let r = "";
  for (let i = 0; i < 8; i++) r += chars.charAt(Math.floor(Math.random() * chars.length));
  return r;
};

/**
 * Bulk email invitations — paste many emails (newline / comma / space separated)
 * and fan out a single request that creates an invitation row per address and
 * triggers the existing send-invitation edge function for each.
 */
export const BulkInviteForm = ({ familyId, defaultRole = "member", expirationDays = 7, onSent }: Props) => {
  const { toast } = useToast();
  const { getRecaptchaToken } = useRecaptcha();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const parseEmails = (raw: string) =>
    Array.from(
      new Set(
        raw
          .split(/[\s,;]+/)
          .map((s) => s.trim().toLowerCase())
          .filter((s) => EMAIL_RX.test(s))
      )
    );

  const emails = parseEmails(text);

  const send = async () => {
    if (emails.length === 0) {
      toast({ title: "No valid emails", description: "Paste at least one email address.", variant: "destructive" });
      return;
    }
    setSending(true);
    let success = 0;
    let failed = 0;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const recaptchaToken = await getRecaptchaToken("invite");

      const expires = new Date();
      expires.setDate(expires.getDate() + expirationDays);

      // Insert all rows first (one round-trip)
      const rows = emails.map((email) => ({
        family_id: familyId,
        email,
        role: defaultRole as "member",
        token: crypto.randomUUID(),
        reference_code: generateRefCode(),
        invitation_type: "email",
        expires_at: expires.toISOString(),
        invited_by: user.id,
      }));

      const { data: inserted, error: insErr } = await supabase
        .from("invitations")
        .insert(rows)
        .select("id, email");

      if (insErr) throw insErr;

      // Fan out edge function calls (parallel, capped concurrency)
      const sendOne = async (id: string) => {
        try {
          await supabase.functions.invoke("send-invitation", {
            body: { invitationId: id, recaptchaToken },
          });
          success++;
        } catch {
          failed++;
        }
      };
      await Promise.all((inserted || []).map((row) => sendOne(row.id)));

      toast({
        title: "Bulk invitations processed",
        description: `${success} sent${failed ? `, ${failed} failed` : ""}.`,
      });
      setText("");
      onSent?.();
    } catch (e) {
      toast({
        title: "Bulk invite failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="bulk-emails">Email addresses</Label>
        <Textarea
          id="bulk-emails"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="alice@example.com, bob@example.com&#10;carol@example.com"
          rows={6}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Separate by comma, space or new line. Detected: <strong>{emails.length}</strong> valid email{emails.length === 1 ? "" : "s"}.
        </p>
      </div>
      <Button onClick={send} disabled={sending || emails.length === 0} className="w-full">
        {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
        Send {emails.length || ""} invitation{emails.length === 1 ? "" : "s"}
      </Button>
    </div>
  );
};

export default BulkInviteForm;

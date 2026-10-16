import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";

export function DeleteAccount() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const remove = async () => {
    if (confirmation !== "DELETE" || busy) return;
    setBusy(true); setError("");
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("delete-account", { body: { confirmation } });
      if (invokeError || !data?.deleted) {
        let code = data?.code;
        if (invokeError && "context" in invokeError && invokeError.context instanceof Response) {
          code = (await invokeError.context.json().catch(() => ({}))).code;
        }
        setError(t(code === "reauth" ? "accountDeletion.reauth" : "accountDeletion.failed"));
        return;
      }
      await supabase.auth.signOut({ scope: "local" });
      localStorage.clear(); sessionStorage.clear();
      if (indexedDB.databases) {
        for (const db of await indexedDB.databases()) if (db.name) indexedDB.deleteDatabase(db.name);
      }
      if ("caches" in window) for (const name of await caches.keys()) await caches.delete(name);
      window.location.replace("/auth");
    } catch { setError(t("accountDeletion.failed")); }
    finally { setBusy(false); }
  };
  return <section className="border-t border-border pt-6 space-y-3">
    <h2 className="text-lg font-semibold text-foreground">{t("accountDeletion.title")}</h2>
    <p className="text-sm text-muted-foreground">{t("accountDeletion.summary")}</p>
    <Button variant="destructive" onClick={() => { setConfirmation(""); setError(""); setOpen(true); }}><Trash2 className="mr-2 h-4 w-4" />{t("accountDeletion.title")}</Button>
    <AlertDialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
      <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
        <AlertDialogHeader><AlertDialogTitle>{t("accountDeletion.confirmTitle")}</AlertDialogTitle><AlertDialogDescription>{t("accountDeletion.warning")}</AlertDialogDescription></AlertDialogHeader>
        <Label htmlFor="delete-confirmation">{t("accountDeletion.type")}</Label>
        <Input id="delete-confirmation" value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={busy} autoComplete="off" />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter><Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>{t("common.cancel")}</Button><Button variant="destructive" disabled={busy || confirmation !== "DELETE"} onClick={remove}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("accountDeletion.confirm")}</Button></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
}
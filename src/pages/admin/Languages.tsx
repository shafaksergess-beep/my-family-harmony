import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Download, Plus, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import en from "@/i18n/locales/en.json";
import fr from "@/i18n/locales/fr.json";
import { flatten, loadLanguages, useLanguages, type LanguageRow } from "@/i18n/languages";

const EN = flatten(en);
const BUNDLED: Record<string, Record<string, string>> = { en: EN, fr: flatten(fr) };
const KEYS = Object.keys(EN).sort();

function csvEscape(v: string) { return `"${(v ?? "").replace(/"/g, '""')}"`; }
function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export default function AdminLanguages() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const langs = useLanguages(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", name: "", native_name: "" });
  const [values, setValues] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fail = (e: { message: string }) => toast({ title: t("common.error"), description: e.message, variant: "destructive" });

  useEffect(() => {
    if (!selected) return;
    (async () => {
      const { data } = await supabase.from("translations").select("key,value").eq("language_code", selected).limit(10000);
      const db: Record<string, string> = {};
      (data ?? []).forEach((r) => (db[r.key] = r.value));
      setValues({ ...(BUNDLED[selected] ?? {}), ...db });
    })();
  }, [selected]);

  const addLanguage = async () => {
    const code = form.code.trim().toLowerCase();
    if (!code || !form.name.trim()) return;
    const { error } = await supabase.from("languages").insert({ code, name: form.name.trim(), native_name: form.native_name.trim() || form.name.trim(), is_active: false });
    if (error) return fail(error);
    setForm({ code: "", name: "", native_name: "" });
    await loadLanguages(true);
    setSelected(code);
    toast({ title: t("admin.languages.added") });
  };

  const toggle = async (l: LanguageRow, active: boolean) => {
    const { error } = await supabase.from("languages").update({ is_active: active }).eq("code", l.code);
    if (error) return fail(error);
    await loadLanguages(true);
  };

  const remove = async (l: LanguageRow) => {
    if (!confirm(t("admin.languages.confirmDelete"))) return;
    const { error } = await supabase.from("languages").delete().eq("code", l.code);
    if (error) return fail(error);
    if (selected === l.code) setSelected(null);
    await loadLanguages(true);
    toast({ title: t("admin.languages.deleted") });
  };

  const saveKey = async (key: string, value: string) => {
    if (!selected) return;
    const bundled = BUNDLED[selected]?.[key];
    if (!value.trim() || value === bundled) {
      await supabase.from("translations").delete().eq("language_code", selected).eq("key", key);
      return;
    }
    const { error } = await supabase.from("translations").upsert({ language_code: selected, key, value }, { onConflict: "language_code,key" });
    if (error) fail(error);
  };

  const exportCsv = () => {
    if (!selected) return;
    const lines = [["key", "english", selected].map(csvEscape).join(",")];
    KEYS.forEach((k) => lines.push([k, EN[k], values[k] ?? ""].map(csvEscape).join(",")));
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `kinsroot-${selected}.csv`; a.click();
  };

  const importCsv = async (file: File) => {
    if (!selected) return;
    const rows = parseCsv((await file.text()).replace(/^\ufeff/, "")).slice(1);
    const upserts = rows.filter((r) => r[0] && EN[r[0]] !== undefined && r[2]?.trim()).map((r) => ({ language_code: selected, key: r[0], value: r[2] }));
    for (let i = 0; i < upserts.length; i += 500) {
      const { error } = await supabase.from("translations").upsert(upserts.slice(i, i + 500), { onConflict: "language_code,key" });
      if (error) return fail(error);
    }
    setValues((v) => ({ ...v, ...Object.fromEntries(upserts.map((u) => [u.key, u.value])) }));
    await loadLanguages(true);
    toast({ title: t("admin.languages.imported", { count: upserts.length }) });
  };

  const done = KEYS.filter((k) => values[k]?.trim()).length;
  const visible = useMemo(() => {
    const s = search.toLowerCase();
    return KEYS.filter((k) => (!onlyMissing || !values[k]?.trim()) && (!s || k.toLowerCase().includes(s) || EN[k].toLowerCase().includes(s) || (values[k] ?? "").toLowerCase().includes(s))).slice(0, 200);
  }, [search, onlyMissing, values]);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} aria-label={t("common.back")}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold">{t("admin.languages.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("admin.languages.subtitle")}</p>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">{t("admin.languages.add")}</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-[1fr_1.5fr_1.5fr_auto] sm:items-end">
            <div className="space-y-1"><Label htmlFor="lc">{t("admin.languages.code")}</Label><Input id="lc" placeholder="dua" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /><p className="text-xs text-muted-foreground">{t("admin.languages.codeHint")}</p></div>
            <div className="space-y-1"><Label htmlFor="ln">{t("admin.languages.name")}</Label><Input id="ln" placeholder="Duala" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><p className="text-xs">&nbsp;</p></div>
            <div className="space-y-1"><Label htmlFor="lnn">{t("admin.languages.nativeName")}</Label><Input id="lnn" placeholder="Duálá" value={form.native_name} onChange={(e) => setForm({ ...form, native_name: e.target.value })} /><p className="text-xs">&nbsp;</p></div>
            <Button onClick={addLanguage} className="mb-5"><Plus className="mr-1 h-4 w-4" />{t("common.add")}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="divide-y p-0">
            {langs.map((l) => (
              <div key={l.code} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{l.native_name} <span className="text-sm text-muted-foreground">· {l.name} · {l.code}</span></p>
                </div>
                {l.is_builtin && <Badge variant="secondary">{t("admin.languages.builtin")}</Badge>}
                <label className="flex items-center gap-2 text-sm">{t("admin.languages.active")}<Switch checked={l.is_active} disabled={l.is_builtin} onCheckedChange={(v) => toggle(l, v)} /></label>
                {l.code !== "en" && <Button size="sm" variant={selected === l.code ? "default" : "outline"} onClick={() => setSelected(l.code)}>{t("admin.languages.translate")}</Button>}
                {!l.is_builtin && <Button size="icon" variant="ghost" onClick={() => remove(l)} aria-label={t("common.delete")}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            ))}
          </CardContent>
        </Card>

        {selected && (
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{t("admin.languages.translate")}: {langs.find((l) => l.code === selected)?.native_name}</CardTitle>
                  <CardDescription>{t("admin.languages.progress", { done, total: KEYS.length })}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={exportCsv}><Download className="mr-1 h-4 w-4" />{t("admin.languages.export")}</Button>
                  <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}><Upload className="mr-1 h-4 w-4" />{t("admin.languages.import")}</Button>
                  <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importCsv(f); e.target.value = ""; }} />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <Input className="max-w-xs" placeholder={t("admin.languages.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={onlyMissing} onCheckedChange={(v) => setOnlyMissing(!!v)} />{t("admin.languages.onlyMissing")}</label>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {visible.map((k) => (
                <div key={k} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
                  <div><p className="text-xs text-muted-foreground">{k}</p><p className="text-sm">{EN[k]}</p></div>
                  <Input aria-label={`${t("admin.languages.translation")} ${k}`} value={values[k] ?? ""} onChange={(e) => setValues({ ...values, [k]: e.target.value })} onBlur={(e) => void saveKey(k, e.target.value)} />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

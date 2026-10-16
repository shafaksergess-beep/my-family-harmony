import { useEffect, useState } from "react";
import i18n from "i18next";
import { supabase } from "@/integrations/supabase/client";

export const BUILTIN_LANGUAGES = ["en", "fr"] as const;
export const PERSONAL_KEY = "preferredLanguage";
export const FALLBACK = "en";

export interface LanguageRow {
  code: string;
  name: string;
  native_name: string;
  is_active: boolean;
  is_builtin: boolean;
}

/** Priority: personal choice > family default > browser > English. Only available codes win. */
export function resolveLanguage(opts: {
  personal?: string | null;
  family?: string | null;
  browser?: string | null;
  available: string[];
}): string {
  const ok = (c?: string | null) => {
    if (!c) return null;
    const base = c.toLowerCase();
    if (opts.available.includes(base)) return base;
    const short = base.split("-")[0];
    return opts.available.includes(short) ? short : null;
  };
  return ok(opts.personal) || ok(opts.family) || ok(opts.browser) || FALLBACK;
}

export function getPersonalLanguage(): string | null {
  try {
    const v = localStorage.getItem(PERSONAL_KEY);
    return v && v !== "bota" ? v : null;
  } catch {
    return null;
  }
}

export function setPersonalLanguage(code: string) {
  try { localStorage.setItem(PERSONAL_KEY, code); } catch { /* ignore */ }
  void i18n.changeLanguage(code);
}

/** Turns flat "a.b.c" keys into nested objects for i18next. */
export function unflatten(rows: { key: string; value: string }[]) {
  const out: Record<string, any> = {};
  for (const { key, value } of rows) {
    const parts = key.split(".");
    let node = out;
    parts.slice(0, -1).forEach((p) => { node[p] = typeof node[p] === "object" ? node[p] : {}; node = node[p]; });
    node[parts[parts.length - 1]] = value;
  }
  return out;
}

export function flatten(obj: Record<string, any>, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") Object.assign(out, flatten(v, key));
    else out[key] = String(v);
  }
  return out;
}

let cache: LanguageRow[] | null = null;
const listeners = new Set<(l: LanguageRow[]) => void>();

export async function loadLanguages(force = false): Promise<LanguageRow[]> {
  if (cache && !force) return cache;
  const { data } = await supabase.from("languages").select("*").order("is_builtin", { ascending: false }).order("name");
  cache = (data as LanguageRow[]) ?? [
    { code: "en", name: "English", native_name: "English", is_active: true, is_builtin: true },
    { code: "fr", name: "French", native_name: "Français", is_active: true, is_builtin: true },
  ];
  // Load translations for active custom languages (and overrides for built-ins).
  const codes = cache.filter((l) => l.is_active).map((l) => l.code);
  if (codes.length) {
    const { data: rows } = await supabase.from("translations").select("language_code,key,value").in("language_code", codes).limit(10000);
    const by: Record<string, { key: string; value: string }[]> = {};
    (rows ?? []).forEach((r: any) => (by[r.language_code] ||= []).push(r));
    Object.entries(by).forEach(([code, list]) => i18n.addResourceBundle(code, "translation", unflatten(list), true, true));
  }
  listeners.forEach((fn) => fn(cache!));
  // Re-apply in case the stored choice is a custom language that just loaded.
  const current = resolveLanguage({ personal: getPersonalLanguage(), browser: navigator.language, available: codes });
  if (current !== i18n.language) void i18n.changeLanguage(current);
  return cache;
}

export function useLanguages(includeInactive = false) {
  const [langs, setLangs] = useState<LanguageRow[]>(cache ?? []);
  useEffect(() => {
    listeners.add(setLangs);
    void loadLanguages();
    return () => { listeners.delete(setLangs); };
  }, []);
  return includeInactive ? langs : langs.filter((l) => l.is_active);
}

/** Applies a family's default language unless the person picked their own. */
export function applyFamilyLanguage(familyLang?: string | null) {
  if (getPersonalLanguage() || !familyLang) return;
  const available = (cache ?? []).filter((l) => l.is_active).map((l) => l.code);
  const code = resolveLanguage({ family: familyLang, browser: navigator.language, available: available.length ? available : [...BUILTIN_LANGUAGES] });
  if (code !== i18n.language) void i18n.changeLanguage(code);
}

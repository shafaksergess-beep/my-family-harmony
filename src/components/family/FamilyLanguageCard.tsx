import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLanguages, applyFamilyLanguage } from "@/i18n/languages";

export function FamilyLanguageCard({ familyId, current }: { familyId: string; current?: string | null }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const langs = useLanguages();
  const [value, setValue] = useState(current || "en");

  const save = async (code: string) => {
    const prev = value;
    setValue(code);
    const { error } = await supabase.from("families").update({ primary_language: code }).eq("id", familyId);
    if (error) {
      setValue(prev);
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      return;
    }
    applyFamilyLanguage(code);
    toast({ title: t("family.languageSaved") });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base"><Languages className="h-4 w-4" />{t("family.languageTitle")}</CardTitle>
          <CardDescription>{t("family.languageDesc")}</CardDescription>
        </div>
        <CardContent className="p-0">
          <Select value={value} onValueChange={save}>
            <SelectTrigger className="w-40" aria-label={t("family.languageTitle")}><SelectValue /></SelectTrigger>
            <SelectContent>
              {langs.map((l) => <SelectItem key={l.code} value={l.code}>{l.native_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </CardHeader>
    </Card>
  );
}

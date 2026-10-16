import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Languages } from "lucide-react";
import { useLanguages, setPersonalLanguage } from "@/i18n/languages";

export const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const langs = useLanguages();
  const list = langs.length ? langs : [{ code: "en", native_name: "English" }, { code: "fr", native_name: "Français" }];

  return (
    <div className="flex items-center gap-2">
      <Languages className="w-4 h-4 text-muted-foreground" />
      <Select value={(i18n.language || "en").split("-")[0]} onValueChange={setPersonalLanguage}>
        <SelectTrigger className="w-32" aria-label={t("common.selectLanguage")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {list.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>{lang.native_name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

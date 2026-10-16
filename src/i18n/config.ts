import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import { resolveLanguage, getPersonalLanguage, BUILTIN_LANGUAGES } from "./languages";

const initial = resolveLanguage({
  personal: getPersonalLanguage(),
  browser: typeof navigator !== "undefined" ? navigator.language : null,
  available: [...BUILTIN_LANGUAGES],
});

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
  lng: initial,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (lng) => {
  if (typeof document !== "undefined") document.documentElement.lang = lng;
});

// Load super-admin-managed languages after startup (non-blocking).
setTimeout(() => { void import("./languages").then((m) => m.loadLanguages()); }, 0);

export default i18n;

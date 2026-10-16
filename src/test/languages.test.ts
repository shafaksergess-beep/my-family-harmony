import { describe, it, expect } from "vitest";
import { resolveLanguage, unflatten } from "@/i18n/languages";

const available = ["en", "fr", "dua"];

describe("language priority", () => {
  it("personal choice beats family default", () => {
    expect(resolveLanguage({ personal: "fr", family: "dua", browser: "en", available })).toBe("fr");
  });
  it("family default applies when no personal choice", () => {
    expect(resolveLanguage({ family: "dua", browser: "fr-FR", available })).toBe("dua");
  });
  it("browser language used when nothing else set", () => {
    expect(resolveLanguage({ browser: "fr-CM", available })).toBe("fr");
  });
  it("falls back to English for unknown or removed languages", () => {
    expect(resolveLanguage({ personal: "bota", family: "xx", browser: "de", available })).toBe("en");
  });
});

describe("translation storage", () => {
  it("turns flat keys into nested groups", () => {
    expect(unflatten([{ key: "home.nav.platform", value: "Plateforme" }])).toEqual({ home: { nav: { platform: "Plateforme" } } });
  });
});

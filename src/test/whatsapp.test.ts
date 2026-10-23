import { describe, it, expect } from "vitest";
import { normalizeWhatsAppNumber, supportWhatsAppLink, whatsAppLink } from "@/lib/whatsapp";

describe("whatsapp links", () => {
  it("support link targets +45 71861759", () => {
    expect(supportWhatsAppLink("Hi")).toBe("https://wa.me/4571861759?text=Hi");
  });
  it("normalises Cameroon numbers with spaces and plus", () => {
    expect(normalizeWhatsAppNumber("+237 691 58 75 35")).toBe("237691587535");
    expect(normalizeWhatsAppNumber("00237691587535")).toBe("237691587535");
  });
  it("rejects too-short numbers and falls back to chat picker", () => {
    expect(normalizeWhatsAppNumber("123")).toBeNull();
    expect(whatsAppLink("a b", "123")).toBe("https://wa.me/?text=a%20b");
  });
});

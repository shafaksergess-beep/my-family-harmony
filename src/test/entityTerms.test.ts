import { describe, it, expect } from "vitest";
import { normalizeEntityType, entityTerm, ENTITY_TYPES } from "@/lib/entityTerms";

const t = (key: string) => key;

describe("entity terms", () => {
  it("supports exactly family, association and tontine", () => {
    expect(ENTITY_TYPES).toEqual(["family", "association", "tontine"]);
  });

  it("keeps valid entity types", () => {
    expect(normalizeEntityType("family")).toBe("family");
    expect(normalizeEntityType("association")).toBe("association");
    expect(normalizeEntityType("tontine")).toBe("tontine");
  });

  it("falls back to family for missing or unknown types (existing rows)", () => {
    expect(normalizeEntityType(null)).toBe("family");
    expect(normalizeEntityType(undefined)).toBe("family");
    expect(normalizeEntityType("village")).toBe("family");
  });

  it("resolves vocabulary through the entity i18n namespace", () => {
    expect(entityTerm("tontine", t, "members")).toBe("entity.tontine.members");
    expect(entityTerm("association", t, "singular")).toBe("entity.association.singular");
    expect(entityTerm(null, t, "singular")).toBe("entity.family.singular");
  });
});

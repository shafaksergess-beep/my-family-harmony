import { describe, it, expect } from "vitest";
import { filterEnabledModules } from "@/hooks/useFamilyModules";

const modules = [
  { slug: "savings", name: "Savings" },
  { slug: "loans", name: "Loans" },
  { slug: "meetings", name: "Meetings" },
];

describe("family module activation", () => {
  it("shows every module when settings have not loaded yet (default-on)", () => {
    expect(filterEnabledModules(modules, null)).toHaveLength(3);
  });

  it("shows every module when no module is disabled", () => {
    expect(filterEnabledModules(modules, new Set())).toHaveLength(3);
  });

  it("hides disabled modules", () => {
    const result = filterEnabledModules(modules, new Set(["loans"]));
    expect(result.map((m) => m.slug)).toEqual(["savings", "meetings"]);
  });

  it("ignores settings rows for modules that no longer exist", () => {
    const result = filterEnabledModules(modules, new Set(["retired-module"]));
    expect(result).toHaveLength(3);
  });
});

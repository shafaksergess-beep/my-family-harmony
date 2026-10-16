import { describe, expect, it } from "vitest";
import { deletionPolicy } from "../../supabase/functions/delete-account/policy";

const now = Date.parse("2026-10-16T10:00:00Z");
describe("self-account deletion", () => {
  it("requires explicit DELETE confirmation", () => {
    expect(deletionPolicy("POST", { confirmation: "delete", userId: "someone-else" }, "2026-10-16T09:59:00Z", now)).toBe("confirmation");
  });
  it("requires sign-in within fifteen minutes", () => {
    expect(deletionPolicy("POST", { confirmation: "DELETE" }, "2026-10-16T09:44:59Z", now)).toBe("reauth");
  });
  it("permits recent confirmed self-deletion", () => {
    expect(deletionPolicy("POST", { confirmation: "DELETE" }, "2026-10-16T09:59:00Z", now)).toBeNull();
  });
});
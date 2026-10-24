import { describe, expect, it } from "vitest";
import { canShowMemberActions } from "@/lib/memberManagement";

describe("member management action parity", () => {
  it("does not expose management actions without the existing permission", () => {
    expect(canShowMemberActions(false, "other-user", "current-user")).toBe(false);
  });
  it("retains the restriction on managing your own member row", () => {
    expect(canShowMemberActions(true, "current-user", "current-user")).toBe(false);
  });
  it("exposes another member's actions with the existing permission", () => {
    expect(canShowMemberActions(true, "other-user", "current-user")).toBe(true);
  });
});
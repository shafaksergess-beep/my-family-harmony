import { describe, expect, it } from "vitest";
import { adminUserProfileIds, canShowMemberActions, matchesAdminUserSearch } from "@/lib/memberManagement";

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

describe("admin user directory scope and search", () => {
  const memberships = [{ user_id: "member-a", family_id: "family-a" }, { user_id: "member-b", family_id: "family-b" }];
  it("does not restrict super admins to users with family memberships", () => {
    expect(adminUserProfileIds(true, memberships, [])).toBeNull();
  });
  it("limits family admins to their managed families", () => {
    expect(adminUserProfileIds(false, memberships, ["family-a"])).toEqual(["member-a"]);
  });
  it("returns no users when there are no managed families", () => {
    expect(adminUserProfileIds(false, memberships, [])).toEqual([]);
  });
  const user = { full_name: "Sample User", email: "sample@example.test", phone: "+237 600123456", families: [{ family: { name: "Sample Clan" } }] };
  it.each([" SAMPLE USER ", "EXAMPLE.TEST", "600123456", "sample clan"])("searches names, email, phone and family: %s", query => {
    expect(matchesAdminUserSearch(user, query)).toBe(true);
  });
  it("does not match unrelated searches", () => {
    expect(matchesAdminUserSearch(user, "missing-user")).toBe(false);
  });
  it("searches unassigned users without requiring a family", () => {
    expect(matchesAdminUserSearch({ ...user, families: [] }, "sample@example.test")).toBe(true);
  });
});
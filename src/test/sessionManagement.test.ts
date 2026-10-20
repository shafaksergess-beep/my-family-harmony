import { describe, expect, it, vi } from "vitest";
import { currentSessionId, revokeOtherSessions } from "../../supabase/functions/session-management/policy";

describe("device session security", () => {
  const sid = "00000000-0000-4000-8000-000000000001";
  it("identifies the current session from verified claims", () => {
    expect(currentSessionId({ session_id: sid, currentSessionId: "another-device" })).toBe(sid);
  });
  it("rejects missing or malformed session claims", () => {
    expect(currentSessionId({ currentSessionId: sid })).toBeUndefined();
    expect(currentSessionId({ session_id: "not-a-session" })).toBeUndefined();
  });
  it("uses the authenticated token and others scope to preserve the current session", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    await revokeOtherSessions(signOut, "test-token");
    expect(signOut).toHaveBeenCalledWith("test-token", "others");
  });
  it("does not report successful revocation when Auth rejects it", async () => {
    const error = new Error("Auth unavailable");
    await expect(revokeOtherSessions(async () => ({ error }), "test-token")).rejects.toThrow("Auth unavailable");
  });
});
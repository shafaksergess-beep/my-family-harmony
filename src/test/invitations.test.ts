import { beforeEach, describe, expect, it, vi } from "vitest";
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
import { acceptInvitation, invitationLookup, invitationReturnPath, previewInvitation } from "@/lib/invitations";

describe("outsider invitation flow", () => {
  beforeEach(() => rpc.mockReset());
  it("normalizes the reported code without changing its value", () => {
    expect(invitationLookup(" ll7eeua2 ")).toEqual({ p_code: "LL7EEUA2" });
  });
  it("preserves invitation codes across signup", () => {
    expect(invitationReturnPath("LL7EEUA2")).toBe("/join/family?code=LL7EEUA2");
  });
  it("preserves token links and prioritizes them over codes", () => {
    expect(invitationLookup("LL7EEUA2", "a&b")).toEqual({ p_token: "a&b" });
    expect(invitationReturnPath(null, "a&b")).toBe("/accept-invitation?token=a%26b");
  });
  it("returns only the server preview, including the intended treasurer role and expiry", async () => {
    const preview = { name: "Tsafack family", role: "treasurer", expires_at: "2026-10-27T12:41:21.088+00:00" };
    rpc.mockResolvedValue({ data: preview, error: null });
    expect(await previewInvitation("LL7EEUA2")).toEqual(preview);
    expect(rpc).toHaveBeenCalledWith("preview_family_invitation", { p_code: "LL7EEUA2" });
  });
  it("does not accept invalid or expired previews", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    expect(await previewInvitation("INVALID1")).toBeNull();
  });
  it("accepts through the atomic authenticated endpoint without client role selection", async () => {
    rpc.mockResolvedValue({ data: { slug: "test", member_id: "member" }, error: null });
    expect(await acceptInvitation("LL7EEUA2")).toEqual({ slug: "test", member_id: "member" });
    expect(rpc).toHaveBeenCalledWith("accept_family_invitation", { p_code: "LL7EEUA2" });
  });
  it("propagates server denial rather than reporting success", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "Sign in to accept this invitation" } });
    await expect(acceptInvitation("LL7EEUA2")).rejects.toMatchObject({ message: "Sign in to accept this invitation" });
  });
});
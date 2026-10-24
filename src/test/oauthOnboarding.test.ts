import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock is hoisted; use vi.hoisted so shared state is initialized before
// the mock factory runs.
const { authState, fromMock } = vi.hoisted(() => ({
  authState: {
    linkIdentity: vi.fn(),
    getUserIdentities: vi.fn(),
  },
  fromMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
    auth: authState,
    from: fromMock,
  },
}));

import { syncUserProfile, stashOAuthRedirect, consumeOAuthRedirect, describeOAuthError } from "@/lib/authSync";
import { needsFamilyOnboarding, resolveSignInDestination } from "@/lib/membershipSync";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

const googleUser = {
  id: "user-1",
  email: "jane@example.com",
  user_metadata: {
    full_name: "Jane Doe",
    avatar_url: "https://cdn.example.com/a.png",
  },
  identities: [
    {
      provider: "google",
      identity_data: { email: "jane@example.com", picture: "https://cdn.example.com/a.png" },
    },
  ],
} as unknown as User;

const appleUser = {
  id: "user-2",
  email: "bob@icloud.com",
  user_metadata: { name: "Bob Ross" },
  identities: [{ provider: "apple", identity_data: { email: "bob@icloud.com" } }],
} as unknown as User;

function mockProfilesTable({ existing }: { existing: any }) {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  fromMock.mockImplementation((table: string) => {
    if (table === "profiles") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: existing, error: null }),
          }),
        }),
        upsert,
      };
    }
    throw new Error("unexpected table " + table);
  });
  return { upsert };
}

function mockFamilyMembersCount(count: number, error: any = null) {
  fromMock.mockReset();
  fromMock.mockImplementation(() => ({
    select: () => ({
      eq: () => Promise.resolve({ count, error }),
    }),
  }));
}

describe("syncUserProfile — profile upsert after OAuth", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("creates a fresh profile using Google identity data (name + avatar)", async () => {
    const { upsert } = mockProfilesTable({ existing: null });
    const result = await syncUserProfile(googleUser);
    expect(result.isNewProfile).toBe(true);
    expect(upsert).toHaveBeenCalledTimes(1);
    const payload = upsert.mock.calls[0][0][0];
    expect(payload).toMatchObject({
      id: "user-1",
      email: "jane@example.com",
      full_name: "Jane Doe",
      avatar_url: "https://cdn.example.com/a.png",
    });
  });

  it("preserves existing full_name and avatar on subsequent sign-ins", async () => {
    const { upsert } = mockProfilesTable({
      existing: { id: "user-1", full_name: "Custom Name", avatar_url: "existing.png" },
    });
    await syncUserProfile(googleUser);
    const payload = upsert.mock.calls[0][0][0];
    expect(payload.full_name).toBe("Custom Name");
    expect(payload.avatar_url).toBeUndefined();
    expect(payload.email).toBe("jane@example.com");
  });

  it("falls back to Apple 'name' metadata when full_name is missing", async () => {
    const { upsert } = mockProfilesTable({ existing: null });
    await syncUserProfile(appleUser);
    const payload = upsert.mock.calls[0][0][0];
    expect(payload.full_name).toBe("Bob Ross");
  });
});

describe("needsFamilyOnboarding — membership sync check", () => {
  beforeEach(() => fromMock.mockReset());

  it("returns true when user has zero family memberships", async () => {
    mockFamilyMembersCount(0);
    expect(await needsFamilyOnboarding("user-1")).toBe(true);
  });

  it("returns false when user already belongs to a family", async () => {
    mockFamilyMembersCount(2);
    expect(await needsFamilyOnboarding("user-1")).toBe(false);
  });

  it("returns false (safe default) on query error", async () => {
    mockFamilyMembersCount(0, { message: "boom" });
    expect(await needsFamilyOnboarding("user-1")).toBe(false);
  });
});

describe("Sign-in destination", () => {
  beforeEach(() => vi.mocked(supabase.rpc).mockResolvedValue({ data: false, error: null } as any));

  it("routes Google users without memberships to setup even with a stashed dashboard", async () => {
    mockFamilyMembersCount(0);
    expect(await resolveSignInDestination("user-1", "/dashboard")).toBe("/onboarding/join-family");
  });

  it("preserves invitation acceptance for unassigned users", async () => {
    fromMock.mockReset();
    expect(await resolveSignInDestination("user-1", "/accept-invitation?token=invite123")).toBe("/accept-invitation?token=invite123");
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("keeps existing members on their dashboard", async () => {
    mockFamilyMembersCount(1);
    expect(await resolveSignInDestination("user-1", "/dashboard")).toBe("/dashboard");
  });

  it("keeps unassigned superadmins on their dashboard", async () => {
    mockFamilyMembersCount(0);
    vi.mocked(supabase.rpc).mockResolvedValue({ data: true, error: null } as any);
    expect(await resolveSignInDestination("admin-1", "/dashboard")).toBe("/dashboard");
  });
});

describe("OAuth redirect stashing (used by Google/Apple flow)", () => {
  beforeEach(() => sessionStorage.clear());

  it("round-trips a same-origin relative path", () => {
    stashOAuthRedirect("/family/acme/dashboard");
    expect(consumeOAuthRedirect()).toBe("/family/acme/dashboard");
    // consumed once
    expect(consumeOAuthRedirect()).toBeNull();
  });

  it("rejects protocol-relative and absolute URLs to prevent open-redirects", () => {
    stashOAuthRedirect("//evil.example.com/pwn");
    expect(consumeOAuthRedirect()).toBeNull();
    stashOAuthRedirect("https://evil.example.com/pwn");
    expect(consumeOAuthRedirect()).toBeNull();
  });
});

describe("describeOAuthError — provider-specific messaging", () => {
  it("names Google in closed-popup errors", () => {
    const msg = describeOAuthError("google", new Error("The popup was closed by the user"));
    expect(msg).toMatch(/Google/);
    expect(msg.toLowerCase()).toContain("closed");
  });

  it("names Apple in disabled-provider errors", () => {
    const msg = describeOAuthError("apple", new Error("Provider is not enabled"));
    expect(msg).toMatch(/Apple/);
  });
});

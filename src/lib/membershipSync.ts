import { supabase } from "@/integrations/supabase/client";

/**
 * Returns true when the given user has no rows in family_members and should
 * be sent through the "Join your family" onboarding step.
 *
 * Isolated so it can be unit-tested with a mocked supabase client.
 */
export async function needsFamilyOnboarding(userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("family_members")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) {
    console.warn("[membershipSync] failed to check family membership:", error.message);
    return false;
  }
  return (count ?? 0) === 0;
}

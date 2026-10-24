import { supabase } from "@/integrations/supabase/client";

export interface InvitationPreview {
  family_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  role: string;
  expires_at: string;
}

export function invitationLookup(code?: string | null, token?: string | null) {
  return token ? { p_token: token } : { p_code: (code || "").trim().toUpperCase() };
}

export function invitationReturnPath(code?: string | null, token?: string | null) {
  return token
    ? `/accept-invitation?token=${encodeURIComponent(token)}`
    : `/join/family?code=${encodeURIComponent((code || "").trim().toUpperCase())}`;
}

export async function previewInvitation(code?: string | null, token?: string | null): Promise<InvitationPreview | null> {
  const { data, error } = await supabase.rpc("preview_family_invitation", invitationLookup(code, token));
  if (error) throw error;
  return data as unknown as InvitationPreview | null;
}

export async function acceptInvitation(code?: string | null, token?: string | null) {
  const { data, error } = await supabase.rpc("accept_family_invitation", invitationLookup(code, token));
  if (error) throw error;
  return data as unknown as { family_id: string; slug: string; member_id: string; already_member: boolean };
}
// Utility for automatic admin activity logging
import { supabase } from "@/integrations/supabase/client";

export interface LogActivityParams {
  action_type: 'create' | 'update' | 'delete' | 'view' | 'export';
  entity_type: 'family' | 'family_member' | 'user' | 'role' | 'settings';
  entity_id?: string;
  details?: any;
}

export async function logAdminActivity(params: LogActivityParams) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Get IP address (best effort - may not work in all environments)
    const ip_address = null; // Could be enhanced with IP detection service

    const { error } = await supabase
      .from('admin_logs')
      .insert({
        admin_user_id: session.user.id,
        action_type: params.action_type,
        entity_type: params.entity_type,
        entity_id: params.entity_id || null,
        details: params.details || null,
        ip_address,
      });

    if (error) {
      console.error('Failed to log admin activity:', error);
    }
  } catch (error) {
    console.error('Error logging admin activity:', error);
  }
}

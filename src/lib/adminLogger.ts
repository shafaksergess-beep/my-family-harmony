// Utility for automatic admin activity logging with email notifications
import { supabase } from "@/integrations/supabase/client";

export interface LogActivityParams {
  action_type: 'create' | 'update' | 'delete' | 'view' | 'export';
  entity_type: 'family' | 'family_member' | 'user' | 'role' | 'settings';
  entity_id?: string;
  details?: any;
  sendNotification?: boolean;
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

    // Send email notification for important actions
    if (params.sendNotification && ['create', 'delete'].includes(params.action_type)) {
      await sendAdminNotification(params, session.user.email || 'admin@example.com');
    }
  } catch (error) {
    console.error('Error logging admin activity:', error);
  }
}

async function sendAdminNotification(params: LogActivityParams, adminEmail: string) {
  try {
    const { getAdminActionEmailTemplate } = await import('./emailTemplates');
    
    const { data: { session } } = await supabase.auth.getSession();
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', session?.user?.id || '')
      .single();

    const htmlContent = getAdminActionEmailTemplate({
      adminName: profile?.full_name || 'Admin User',
      actionType: params.action_type,
      entityType: params.entity_type,
      entityId: params.entity_id || undefined,
      details: params.details,
      timestamp: new Date().toISOString(),
    });

    await supabase.functions.invoke('send-notification', {
      body: {
        to: [adminEmail],
        subject: `🔔 Admin Action: ${params.action_type.toUpperCase()} ${params.entity_type}`,
        message: htmlContent,
        type: 'admin_action'
      }
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

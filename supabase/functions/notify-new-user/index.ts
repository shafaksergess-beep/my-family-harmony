import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NewUserPayload {
  type: string;
  table: string;
  record: {
    id: string;
    email: string;
    full_name: string;
    phone?: string;
    created_at: string;
  };
  schema: string;
  old_record: null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify webhook secret - only callable by trusted DB webhook
  const provided = req.headers.get('x-webhook-secret') || req.headers.get('x-cron-secret');
  const expected = Deno.env.get('WEBHOOK_SECRET') || Deno.env.get('CRON_SECRET');
  if (!expected || !provided || provided !== expected) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload: NewUserPayload = await req.json();
    
    console.log("New user created:", payload.record);

    // Create admin notification
    const { error: notifError } = await supabaseAdmin
      .from("admin_notifications")
      .insert({
        notification_type: "new_user",
        title: "New User Registered",
        message: `${payload.record.full_name || payload.record.email} has created an account.`,
        data: {
          user_id: payload.record.id,
          email: payload.record.email,
          full_name: payload.record.full_name,
          phone: payload.record.phone,
          created_at: payload.record.created_at,
        },
      });

    if (notifError) {
      console.error("Error creating admin notification:", notifError);
    }

    // Get all super admins for push notifications
    const { data: superAdmins, error: adminsError } = await supabaseAdmin
      .from("super_admins")
      .select("user_id");

    if (adminsError) {
      console.error("Error fetching super admins:", adminsError);
    } else if (superAdmins && superAdmins.length > 0) {
      // Get admin profiles for notification preferences
      const adminUserIds = superAdmins.map(a => a.user_id);
      
      const { data: adminProfiles } = await supabaseAdmin
        .from("profiles")
        .select("id, email, full_name")
        .in("id", adminUserIds);

      console.log(`Notifying ${adminProfiles?.length || 0} super admins about new user`);

      // Here you could send push notifications via OneSignal or similar
      // For now, we just log and store the in-app notification
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error processing new user notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

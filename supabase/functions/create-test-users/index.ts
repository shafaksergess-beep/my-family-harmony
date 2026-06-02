import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestUser {
  email: string;
  password: string;
  fullName: string;
  role: 'super_admin' | 'family_head' | 'family_admin' | 'secretary' | 'treasurer' | 'loan_committee' | 'member' | 'guest';
}

const TEST_USERS: TestUser[] = [
  {
    email: "superadmin@test.com",
    password: "TestPass123!",
    fullName: "Super Admin User",
    role: "super_admin",
  },
  {
    email: "familyhead@test.com",
    password: "TestPass123!",
    fullName: "Family Head User",
    role: "family_head",
  },
  {
    email: "familyadmin@test.com",
    password: "TestPass123!",
    fullName: "Family Admin User",
    role: "family_admin",
  },
  {
    email: "secretary@test.com",
    password: "TestPass123!",
    fullName: "Secretary User",
    role: "secretary",
  },
  {
    email: "treasurer@test.com",
    password: "TestPass123!",
    fullName: "Treasurer User",
    role: "treasurer",
  },
  {
    email: "loancommittee@test.com",
    password: "TestPass123!",
    fullName: "Loan Committee User",
    role: "loan_committee",
  },
  {
    email: "member@test.com",
    password: "TestPass123!",
    fullName: "Regular Member User",
    role: "member",
  },
  {
    email: "guest@test.com",
    password: "TestPass123!",
    fullName: "Guest User",
    role: "guest",
  },
];

const TEST_FAMILY_ID = "00000000-0000-0000-0000-000000000001";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Disable in production - test users have predictable shared passwords
    if (Deno.env.get('ALLOW_TEST_USERS') !== 'true') {
      return new Response(
        JSON.stringify({ error: 'Test user creation is disabled in this environment' }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // SECURITY: Require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No authorization header' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create client with user's auth to verify their identity
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the user is authenticated
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      console.error("Failed to get user:", userError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`User ${user.id} attempting to create test users`);

    // Create admin client to check super_admin status (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // SECURITY: Verify the caller is a super admin
    const { data: superAdminCheck, error: superAdminError } = await supabaseAdmin
      .from("super_admins")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (superAdminError || !superAdminCheck) {
      console.error(`User ${user.id} is not a super admin - access denied`);
      return new Response(
        JSON.stringify({ error: 'Forbidden - Only super admins can create test users' }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Super admin ${user.id} authorized - starting test user creation...`);

    const results = [];

    for (const testUser of TEST_USERS) {
      console.log(`Creating user: ${testUser.email}`);

      try {
        // Create user with admin API (auto-confirms email)
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: testUser.email,
          password: testUser.password,
          email_confirm: true,
          user_metadata: {
            full_name: testUser.fullName,
          },
        });

        if (authError) {
          // User might already exist, try to get them
          const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = existingUsers?.users?.find(u => u.email === testUser.email);
          
          if (existingUser) {
            console.log(`User ${testUser.email} already exists, using existing user`);
            
            // Update profile if it doesn't match
            await supabaseAdmin
              .from("profiles")
              .update({ full_name: testUser.fullName })
              .eq("id", existingUser.id);

            // Handle role assignment for existing user
            if (testUser.role === "super_admin") {
              const { data: existingSuperAdmin } = await supabaseAdmin
                .from("super_admins")
                .select("id")
                .eq("user_id", existingUser.id)
                .single();
              
              if (!existingSuperAdmin) {
                await supabaseAdmin
                  .from("super_admins")
                  .insert({ user_id: existingUser.id });
              }
            } else {
              const { data: existingMember } = await supabaseAdmin
                .from("family_members")
                .select("id")
                .eq("user_id", existingUser.id)
                .eq("family_id", TEST_FAMILY_ID)
                .single();

              if (!existingMember) {
                await supabaseAdmin
                  .from("family_members")
                  .insert({
                    user_id: existingUser.id,
                    family_id: TEST_FAMILY_ID,
                    role: testUser.role,
                  });
              } else {
                await supabaseAdmin
                  .from("family_members")
                  .update({ role: testUser.role })
                  .eq("id", existingMember.id);
              }
            }

            results.push({
              email: testUser.email,
              status: "exists",
              role: testUser.role,
              userId: existingUser.id,
            });
            continue;
          }

          throw authError;
        }

        const userId = authData.user.id;
        console.log(`User created: ${userId}`);

        // Assign role
        if (testUser.role === "super_admin") {
          const { error: superAdminRoleError } = await supabaseAdmin
            .from("super_admins")
            .insert({ user_id: userId });

          if (superAdminRoleError) {
            console.error(`Failed to assign super_admin role:`, superAdminRoleError);
          }
        } else {
          const { error: memberError } = await supabaseAdmin
            .from("family_members")
            .insert({
              user_id: userId,
              family_id: TEST_FAMILY_ID,
              role: testUser.role,
            });

          if (memberError) {
            console.error(`Failed to add family member:`, memberError);
          }
        }

        results.push({
          email: testUser.email,
          status: "created",
          role: testUser.role,
          userId: userId,
        });

        console.log(`Successfully created and assigned role for ${testUser.email}`);
      } catch (userCreateError: any) {
        console.error(`Failed to create user ${testUser.email}:`, userCreateError);
        results.push({
          email: testUser.email,
          status: "error",
          error: userCreateError.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Test users creation completed",
        results: results,
        credentials: {
          note: "All test accounts use password: TestPass123!",
          testFamilySlug: "test-family",
          users: TEST_USERS.map(u => ({
            email: u.email,
            role: u.role,
          })),
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error creating test users:", error);
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

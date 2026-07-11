import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { requireAuth, requireFamilyMember } = await import("../_shared/auth.ts");
  const auth = await requireAuth(req, corsHeaders);
  if (auth instanceof Response) return auth;

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { familyId } = await req.json();

    if (!familyId) {
      return new Response(
        JSON.stringify({ error: 'Family ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const membership = await requireFamilyMember(auth.userId, familyId, corsHeaders);
    if (membership instanceof Response) return membership;


    // Get family details for context
    const { data: family, error: familyError } = await supabaseClient
      .from('families')
      .select('name, description, heritage_info')
      .eq('id', familyId)
      .single();

    if (familyError || !family) {
      throw new Error('Family not found');
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `Generate 3 engaging, fun, and culturally relevant conversation starters (icebreakers) for a family group chat.
    
    Family Name: ${family.name}
    Family Description: ${family.description || 'A unified family group'}
    Heritage/Background: ${family.heritage_info || 'Strong family values'}

    The icebreakers should:
    1. Be concise (max 2 sentences each).
    2. Encourage members to share personal stories, memories, or future aspirations.
    3. Feel warm and inclusive.
    4. Be formatted as a simple plain text list with each icebreaker on a new line. No numbering or bullets.

    Example vibe-starters:
    What is your favorite childhood memory from a family gathering?
    If our family had a theme song, what would it be and why?
    What's one piece of advice from an elder that has stuck with you?`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a friendly family facilitator who helps spark meaningful conversations in family groups. You understand cultural nuances and the importance of family bonds."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content generated");
    }

    // Parse the icebreakers (line by line)
    const icebreakers = content
      .split('\n')
      .map(line => line.replace(/^[-*•\d.]+\s*/, '').trim())
      .filter(line => line.length > 5)
      .slice(0, 3);

    return new Response(
      JSON.stringify({ icebreakers }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error generating vibe-starter:', error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate vibe-starter" }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

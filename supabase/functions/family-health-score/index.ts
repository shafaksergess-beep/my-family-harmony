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

    // Fetch data for health score calculation
    const [
      { data: family },
      { count: memberCount },
      { data: contributions },
      { data: loans },
      { data: meetings }
    ] = await Promise.all([
      supabaseClient.from('families').select('name').eq('id', familyId).single(),
      supabaseClient.from('family_members').select('*', { count: 'exact', head: true }).eq('family_id', familyId),
      supabaseClient.from('contributions').select('amount, status, type').eq('family_id', familyId),
      supabaseClient.from('loans').select('amount, status').eq('family_id', familyId),
      supabaseClient.from('meetings').select('is_completed').eq('family_id', familyId).limit(10)
    ]);

    // Calculate basic metrics
    const totalPaid = contributions?.filter(c => c.status === 'paid').length || 0;
    const totalPending = contributions?.filter(c => c.status === 'pending').length || 0;
    const paymentRate = (totalPaid + totalPending) > 0 ? (totalPaid / (totalPaid + totalPending)) * 100 : 100;
    
    const activeLoans = loans?.filter(l => l.status === 'active' || l.status === 'disbursed').length || 0;
    const meetingParticipation = meetings?.filter(m => m.is_completed).length || 0;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `Based on the following data for the "${family?.name}" group, calculate a 'Family Health Score' (0-100) and provide a qualitative analysis.

    Data:
    - Member Count: ${memberCount}
    - Contribution Payment Rate: ${paymentRate.toFixed(1)}%
    - Active Loans: ${activeLoans}
    - Recent Meetings Completed: ${meetingParticipation}/10
    
    Provide a JSON response with:
    1. "score": number (0-100)
    2. "status": string (e.g., "Thriving", "Stable", "At Risk")
    3. "analysis": string (2-3 sentences explaining the score)
    4. "improvements": array of 3 strings (actionable advice)`;

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
            content: "You are a specialized AI analyzer for family-based mutual aid groups (Njangis/Tontines). You provide objective health scores and constructive advice based on financial and engagement metrics."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.5,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) throw new Error(`AI gateway error: ${response.status}`);
    const result = await response.json();
    const healthData = JSON.parse(result.choices[0].message.content);

    return new Response(
      JSON.stringify(healthData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error calculating health score:', error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to calculate health score" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { requireAuth } = await import("../_shared/auth.ts");
  const auth = await requireAuth(req, corsHeaders);
  if (auth instanceof Response) return auth;

  try {
    const { familyName, financialData } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `Analyze the following financial data for the ${familyName} family and provide a concise summary, key risks, and 3 actionable recommendations for the family treasurer.

    Financial Data (Last 12 Months):
    - Contributions Trends: ${JSON.stringify(financialData.contributionTrends)}
    - Loan Forecast: ${JSON.stringify(financialData.loanRepaymentsForecast)}
    - 6-Month Projections: ${JSON.stringify(financialData.monthlyProjections)}

    Please respond with a JSON object containing:
    1. "summary": A 2-3 sentence overview of the family's financial health.
    2. "risks": A 1-2 sentence identification of any potential risks.
    3. "recommendations": An array of 3 specific, actionable steps.

    Ensure the response is ONLY valid JSON.`;

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
            content: "You are a professional financial advisor specializing in family mutual aid and collective savings groups. You provide empathetic yet data-driven advice."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
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

    return new Response(
      content,
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error generating financial insight:', error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate financial insight" }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

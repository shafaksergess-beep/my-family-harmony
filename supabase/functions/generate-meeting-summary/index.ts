import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { requireAuth } = await import("../_shared/auth.ts");
  const auth = await requireAuth(req, corsHeaders);
  if (auth instanceof Response) return auth;

  try {
    const { meetingContent, agendaItems, actionItems } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build the prompt with meeting content
    let prompt = "Generate a concise, professional meeting summary based on the following information:\n\n";
    
    if (meetingContent) {
      prompt += `Meeting Minutes:\n${meetingContent}\n\n`;
    }

    if (agendaItems && agendaItems.length > 0) {
      prompt += `Agenda Items Discussed:\n`;
      agendaItems.forEach((item: any, index: number) => {
        prompt += `${index + 1}. ${item.title}`;
        if (item.description) prompt += `: ${item.description}`;
        prompt += `\n`;
      });
      prompt += `\n`;
    }

    if (actionItems && actionItems.length > 0) {
      prompt += `Action Items:\n`;
      actionItems.forEach((item: any, index: number) => {
        prompt += `${index + 1}. ${item.task}`;
        if (item.assignedTo) prompt += ` (Assigned to: ${item.assignedTo})`;
        if (item.deadline) prompt += ` - Due: ${item.deadline}`;
        prompt += `\n`;
      });
      prompt += `\n`;
    }

    prompt += `Please provide a well-structured summary that includes:
1. Key discussion points
2. Important decisions made
3. Action items and next steps
4. Any concerns or risks raised

Keep the summary concise but comprehensive, using bullet points where appropriate.`;

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
            content: "You are a professional meeting secretary who creates clear, concise, and actionable meeting summaries. Focus on key decisions, action items, and important discussions."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your Lovable workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content;

    if (!summary) {
      throw new Error("No summary generated");
    }

    return new Response(
      JSON.stringify({ summary }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error generating summary:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate summary" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

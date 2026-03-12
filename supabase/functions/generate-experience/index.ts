import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, profile, spurAnswers } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an experience designer for a personalized wellness app called Kaitality. 
The user has a profile with health goals, passions, and SPUR motivation dimensions. They will prompt you with what kind of experience they want to build.

Your job: generate a self-contained interactive mini-experience as a React component rendered as HTML/JSX description. Return a JSON object with:
- "title": short catchy name (3-5 words)
- "description": one-sentence description  
- "type": one of "tracker", "challenge", "reflection", "routine", "visualization", "game"
- "steps": array of 3-6 interactive steps, each with { "instruction": string, "inputType": "choice" | "text" | "slider" | "timer" | "checklist", "options"?: string[], "duration"?: number }
- "personalization": one sentence explaining how this is tailored to their profile
- "emoji": a single emoji representing this experience

Be creative, personal, and specific to their profile. Make it feel like software built just for them.

User profile:
- Name: ${profile?.name || "User"}
- Health goals: ${(profile?.healthGoals || []).join(", ") || "none yet"}
- Passions: ${(profile?.passions || []).join(", ") || "none yet"}
- SPUR answers: ${Object.keys(spurAnswers || {}).length} questions answered
`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_experience",
              description: "Generate a personalized mini-experience for the user",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  type: { type: "string", enum: ["tracker", "challenge", "reflection", "routine", "visualization", "game"] },
                  emoji: { type: "string" },
                  personalization: { type: "string" },
                  steps: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        instruction: { type: "string" },
                        inputType: { type: "string", enum: ["choice", "text", "slider", "timer", "checklist"] },
                        options: { type: "array", items: { type: "string" } },
                        duration: { type: "number" },
                      },
                      required: ["instruction", "inputType"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["title", "description", "type", "emoji", "personalization", "steps"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_experience" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited — please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Add credits in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No experience generated" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const experience = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(experience), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-experience error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

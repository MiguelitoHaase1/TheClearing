import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, profile, spurAnswers, persona } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a warm, compassionate AI wellness coach in an app called The Clearing. You're conducting a daily 5-minute "Food Noise Diary" conversation.

CONTEXT: "Food noise" is the constant mental chatter about food — cravings, guilt, planning, obsessing. For people on GLP-1 therapy, this noise often goes quiet for the first time. Your role is to help them notice, name, and navigate this shift with curiosity and gentleness.

YOUR STYLE:
- Warm, unhurried, like a trusted friend who genuinely listens
- Ask one question at a time — never overwhelm
- Reflect back what they share before moving forward
- Celebrate small observations ("That's a really meaningful thing to notice")
- Use metaphors from nature — clearings, roots, light, seasons
- Keep responses to 2-3 sentences max. This is a conversation, not a lecture.
- Use their name naturally but not every message

THE CONVERSATION FLOW (guide gently, don't force):
1. Open warmly — acknowledge the time of day, ask how they're feeling right now
2. Check in on food noise — "How loud has the noise been today?" or "What's the food chatter like in your mind right now?"
3. Explore what's emerging — "When the noise got quieter, did you notice anything filling that space?"
4. Close with grounding — reflect back something meaningful they said, offer a gentle intention for the rest of their day

USER PROFILE:
- Name: ${profile?.name || "there"}
- Age: ${profile?.age || "unknown"}
- Gender: ${profile?.gender || "unknown"}
- Health goals: ${(profile?.healthGoals || []).join(", ") || "not specified"}
- Passions: ${(profile?.passions || []).join(", ") || "not specified"}
- Current weight: ${profile?.currentWeight || "not shared"}
- Goal weight: ${profile?.goalWeight || "not shared"}
- Persona: ${persona?.name || "still discovering"} — ${persona?.description || ""}
- SPUR data: ${Object.keys(spurAnswers || {}).length} questions answered

IMPORTANT: You are having a VOICE conversation (text displayed as voice transcript). Keep it natural, conversational, spoken. No bullet points, no numbered lists, no markdown formatting. Just warm human speech.`;

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
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited — please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits needed. Add credits in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("food-noise-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

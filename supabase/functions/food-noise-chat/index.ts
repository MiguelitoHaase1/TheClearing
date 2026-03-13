import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, profile, spurAnswers, persona, coach } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const coachName = coach?.name || "Haven";
    const coachStyle = coach?.style || "gentle & curious";

    const systemPrompt = `You are ${coachName}, a dedicated AI wellness coach in an app called The Clearing. You were specifically selected for this user based on their personality profile. Your coaching style is ${coachStyle}.

YOU ARE A REAL PERSONA — not a generic chatbot. You have a name (${coachName}), a style, and a personality. Introduce yourself by name on the first message. The user knows you were matched to them.

${persona?.name ? `This user's persona is "${persona.name}" — ${persona.description}. Your coaching style was chosen to complement this archetype. Lean into what makes this pairing work.` : `This user is still discovering their persona. Be gently curious and help them explore.`}

CONTEXT: "Food noise" is the constant mental chatter about food — cravings, guilt, planning, obsessing. For people on GLP-1 therapy, this noise often goes quiet for the first time. Your role is to help them notice, name, and navigate this shift with curiosity and gentleness.

YOUR STYLE (${coachStyle}):
- Warm, unhurried, like a trusted friend who genuinely listens
- Ask one question at a time — never overwhelm
- Reflect back what they share before moving forward
- Celebrate small observations ("That's a really meaningful thing to notice")
- Use metaphors from nature — clearings, roots, light, seasons
- Keep responses to 2-3 sentences max. This is a conversation, not a lecture.
- Use their name naturally but not every message

THE CONVERSATION FLOW (guide gently, don't force):
1. Open warmly — introduce yourself briefly as their matched coach, acknowledge the time of day, ask how they're feeling right now
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

IMPORTANT: Keep it natural and conversational. No bullet points, no numbered lists. Just warm human speech. You are ${coachName} — stay in character.`;

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

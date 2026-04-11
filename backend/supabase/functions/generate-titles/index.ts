import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STRATEGIES = [
  "curiosity_gap",
  "power_number",
  "how_to",
  "controversy",
  "emotional_trigger",
  "fomo",
] as const;

type Strategy = typeof STRATEGIES[number];

const buildFallbackTitles = (topic: string, audience: string, language: string, tone: string) => {
  const cleanTopic = topic.trim().replace(/\s+/g, " ");
  const softAudience = audience && audience !== "General" ? ` for ${audience}` : "";
  const toneHint = tone ? ` (${tone})` : "";

  const templates: Record<Strategy, (t: string) => { title: string; why_it_works: string; emoji: string }> = {
    curiosity_gap: (t) => ({
      title: `I tried ${t} and this happened`,
      why_it_works: "Creates a curiosity gap by promising a surprising payoff.",
      emoji: "😮",
    }),
    power_number: (t) => ({
      title: `7 lessons I learned from ${t}`,
      why_it_works: "Numbered structure improves clarity and click intent.",
      emoji: "📈",
    }),
    how_to: (t) => ({
      title: `How to win at ${t}${softAudience}`,
      why_it_works: "How-to framing promises practical value quickly.",
      emoji: "🛠️",
    }),
    controversy: (t) => ({
      title: `Everyone is wrong about ${t}`,
      why_it_works: "Contrarian angle triggers debate and strong reactions.",
      emoji: "⚡",
    }),
    emotional_trigger: (t) => ({
      title: `${t} changed the way I think${toneHint}`,
      why_it_works: "Emotional framing builds personal connection and intrigue.",
      emoji: "❤️",
    }),
    fomo: (t) => ({
      title: `Do this before ${t} gets too competitive`,
      why_it_works: "Urgency and fear-of-missing-out increase immediate clicks.",
      emoji: "🚀",
    }),
  };

  const scoresByStrategy: Record<Strategy, number> = {
    curiosity_gap: 82,
    power_number: 79,
    how_to: 77,
    controversy: 75,
    emotional_trigger: 80,
    fomo: 81,
  };

  return STRATEGIES.map((strategy) => {
    const built = templates[strategy](cleanTopic || "this topic");
    return {
      title: built.title,
      strategy,
      ctr_score: scoresByStrategy[strategy],
      emoji: built.emoji,
      why_it_works: `${built.why_it_works} Language: ${language || "English"}.`,
    };
  });
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, category, audience, language, tone } = await req.json();
    if (!topic) {
      return new Response(JSON.stringify({ error: "Topic is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

    if (!GROQ_API_KEY) {
      const titles = buildFallbackTitles(topic, audience || "General", language || "English", tone || "Curious");
      return new Response(JSON.stringify({ titles, fallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a top YouTube growth strategist with deep knowledge of what titles go viral. Generate 6 distinct YouTube video title options. Each must use a different CTR technique from: curiosity_gap, power_number, how_to, controversy, emotional_trigger, fomo.

Respond ONLY as a JSON array with no markdown, no preamble, no code fences:
[{"title": "...", "strategy": "curiosity_gap", "ctr_score": 82, "emoji": "🔥", "why_it_works": "..."}]

Rules:
- ctr_score should be a realistic number between 55-95
- Each title should be unique and use a different strategy
- Titles should be optimized for maximum click-through rate
- If language is Hindi or regional, generate titles in that language using correct script
- Keep titles under 60 characters when possible`;

    const userPrompt = `Topic: ${topic}
Category: ${category || "General"}
Audience: ${audience || "General"}
Language: ${language || "English"}
Tone: ${tone || "Curious"}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.8,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      const titles = buildFallbackTitles(topic, audience || "General", language || "English", tone || "Curious");
      return new Response(JSON.stringify({ titles, fallback: true, provider_status: response.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response (handle potential markdown wrapping)
    let titles;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        titles = JSON.parse(jsonMatch[0]);
      } else {
        titles = JSON.parse(content);
      }
    } catch {
      console.error("Failed to parse titles:", content);
      titles = buildFallbackTitles(topic, audience || "General", language || "English", tone || "Curious");
    }

    return new Response(JSON.stringify({ titles }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    console.error("generate-titles error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

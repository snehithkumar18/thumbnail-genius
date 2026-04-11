import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const buildFallbackTrends = (nicheKey: string) => ([
  {
    name: `${nicheKey === "all" ? "High Contrast" : nicheKey.toUpperCase()} Shock Reveal`,
    category: nicheKey,
    why_it_works: "Uses contrast, emotion, and immediate curiosity to stop the scroll.",
    psychological_trigger: "curiosity",
    best_niches: [nicheKey === "all" ? "tech" : nicheKey, "education", "entertainment"],
    generation_prompt: `Create a bold YouTube thumbnail for ${nicheKey === "all" ? "any niche" : nicheKey} with dramatic lighting, oversized facial expression, and strong contrast colors.`,
    trend_status: "hot",
  },
  {
    name: "Before vs After Split",
    category: nicheKey,
    why_it_works: "Clear visual comparison makes the value proposition obvious instantly.",
    psychological_trigger: "clarity",
    best_niches: ["education", "fitness", "finance"],
    generation_prompt: "Use a split-screen layout showing before and after, with bold labels and exaggerated difference.",
    trend_status: "classic",
  },
  {
    name: "Big Number Promise",
    category: nicheKey,
    why_it_works: "Numbers create specificity and make results feel measurable.",
    psychological_trigger: "certainty",
    best_niches: ["finance", "business", "tech"],
    generation_prompt: "Design a thumbnail featuring a huge number overlay, energetic face, and a clean high-contrast background.",
    trend_status: "hot",
  },
  {
    name: "Problem Statement Close-Up",
    category: nicheKey,
    why_it_works: "A recognizable problem framed in a face close-up increases empathy and clicks.",
    psychological_trigger: "empathy",
    best_niches: ["education", "tech", "productivity"],
    generation_prompt: "Create a close-up thumbnail of a creator reacting to a clear problem, with strong text and a simple background.",
    trend_status: "new",
  },
  {
    name: "Reaction + Arrow",
    category: nicheKey,
    why_it_works: "Reaction faces plus directional arrows are fast to understand on mobile.",
    psychological_trigger: "attention",
    best_niches: ["gaming", "tech", "entertainment"],
    generation_prompt: "Use a shocked reaction face, bright arrows, and one focal object or result in the frame.",
    trend_status: "hot",
  },
  {
    name: "Minimal Premium",
    category: nicheKey,
    why_it_works: "Minimal layouts feel premium and keep attention on the main idea.",
    psychological_trigger: "status",
    best_niches: ["luxury", "business", "tech"],
    generation_prompt: "Design a clean, premium thumbnail with one subject, a subtle background, and elegant accent colors.",
    trend_status: "classic",
  },
  {
    name: "Challenge Outcome",
    category: nicheKey,
    why_it_works: "Challenges imply a story arc and a payoff, which makes people curious.",
    psychological_trigger: "story",
    best_niches: ["fitness", "gaming", "education"],
    generation_prompt: "Show a creator in the middle of a challenge with progress indicators and a dramatic result cue.",
    trend_status: "new",
  },
  {
    name: "Myth Busting",
    category: nicheKey,
    why_it_works: "Contrarian framing encourages debate and attention.",
    psychological_trigger: "controversy",
    best_niches: ["finance", "tech", "education"],
    generation_prompt: "Create a thumbnail that visually challenges a common belief with bold text and a split visual.",
    trend_status: "hot",
  },
  {
    name: "Urgency Countdown",
    category: nicheKey,
    why_it_works: "Deadlines and countdowns create urgency and reduce hesitation.",
    psychological_trigger: "fomo",
    best_niches: ["marketing", "business", "tech"],
    generation_prompt: "Use a countdown motif, urgent typography, and a focused subject with high-energy colors.",
    trend_status: "new",
  },
]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { niche } = await req.json().catch(() => ({ niche: "all" }));
    const nicheKey = (niche || "all").toLowerCase();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      (Deno.env.get("SB_SERVICE_ROLE_JWT") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!
    );

    // Check cache (24h TTL)
    const { data: cached } = await supabaseAdmin
      .from("trending_cache")
      .select("content, updated_at")
      .eq("niche", nicheKey)
      .single();

    if (cached) {
      const age = Date.now() - new Date(cached.updated_at).getTime();
      if (age < 24 * 60 * 60 * 1000) {
        return new Response(JSON.stringify({ trends: cached.content }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Generate fresh trends
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      return new Response(JSON.stringify({ trends: buildFallbackTrends(nicheKey), fallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nicheFilter = nicheKey !== "all" ? ` Focus specifically on the ${nicheKey} niche.` : "";

    const systemPrompt = `You are a YouTube thumbnail trend analyst for 2025. List 9 high-performing YouTube thumbnail styles/patterns that are currently working.${nicheFilter}

Return ONLY a JSON array, no markdown, no code fences:
[{
  "name": "Style Name",
  "category": "niche",
  "why_it_works": "one line explanation",
  "psychological_trigger": "trigger name",
  "best_niches": ["niche1", "niche2"],
  "generation_prompt": "detailed prompt to generate a thumbnail in this style, include specific visual elements, colors, composition details",
  "trend_status": "hot"
}]

trend_status must be one of: hot, classic, new
Make generation_prompt detailed enough to directly use in an image generator.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.6,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate 9 trending YouTube thumbnail styles for 2025." },
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status, await response.text());
      if (cached) {
        return new Response(JSON.stringify({ trends: cached.content }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ trends: buildFallbackTrends(nicheKey), fallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    let trends;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      trends = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      console.error("Failed to parse trends:", content);
      if (cached) {
        return new Response(JSON.stringify({ trends: cached.content }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ trends: buildFallbackTrends(nicheKey), fallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert cache
    await supabaseAdmin
      .from("trending_cache")
      .upsert({ niche: nicheKey, content: trends, updated_at: new Date().toISOString() }, { onConflict: "niche" });

    return new Response(JSON.stringify({ trends }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    console.error("get-trends error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { niche } = await req.json().catch(() => ({ niche: "all" }));
    const nicheKey = (niche || "all").toLowerCase();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
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
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

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

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate 9 trending YouTube thumbnail styles for 2025." },
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status, await response.text());
      // Return stale cache if available
      if (cached) {
        return new Response(JSON.stringify({ trends: cached.content }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Failed to generate trends");
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
      throw new Error("Failed to parse AI response");
    }

    // Upsert cache
    await supabaseAdmin
      .from("trending_cache")
      .upsert({ niche: nicheKey, content: trends, updated_at: new Date().toISOString() }, { onConflict: "niche" });

    return new Response(JSON.stringify({ trends }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("get-trends error:", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

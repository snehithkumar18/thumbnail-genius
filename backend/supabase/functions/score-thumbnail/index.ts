import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const bypassCredits = Deno.env.get("BYPASS_CREDITS") === "true";
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      (Deno.env.get("SB_ANON_JWT") ?? Deno.env.get("SUPABASE_ANON_KEY"))!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      (Deno.env.get("SB_SERVICE_ROLE_JWT") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { image_url } = await req.json();
    if (!image_url) {
      return new Response(JSON.stringify({ error: "image_url is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check credits
    let { data: creditData, error: creditError } = await supabase
      .from("user_credits")
      .select("credits_remaining")
      .eq("user_id", user.id)
      .single();

    if (!creditData) {
      const noRow = (creditError as any)?.code === "PGRST116";
      if (!creditError || noRow) {
        const { error: seedError } = await supabaseAdmin
          .from("user_credits")
          .upsert(
            {
              user_id: user.id,
              credits_remaining: 5,
              plan_type: "free",
            },
            { onConflict: "user_id", ignoreDuplicates: true }
          );

        if (!seedError) {
          const { data: hydratedCredits } = await supabase
            .from("user_credits")
            .select("credits_remaining")
            .eq("user_id", user.id)
            .single();
          creditData = hydratedCredits;
        }
      }
    }

    if (!bypassCredits && (!creditData || creditData.credits_remaining < 1)) {
      return new Response(JSON.stringify({ error: "Not enough credits" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const imageResp = await fetch(image_url);
    if (!imageResp.ok) {
      throw new Error("Unable to fetch thumbnail image for analysis");
    }
    const mimeType = imageResp.headers.get("content-type") || "image/png";
    const imageBase64 = arrayBufferToBase64(await imageResp.arrayBuffer());

    const systemPrompt = `You are an expert YouTube thumbnail analyst with years of experience optimizing thumbnails for viral content. Analyze the thumbnail image and score it on 5 dimensions from 0-100.

Return ONLY valid JSON, no markdown, no code fences:
{
  "overall": number,
  "virality": number,
  "clarity": number,
  "emotion": number,
  "curiosity": number,
  "design": number,
  "category": "detected niche/category",
  "improvements": [
    {"tip": "specific actionable improvement", "priority": "high"},
    {"tip": "specific actionable improvement", "priority": "medium"},
    {"tip": "specific actionable improvement", "priority": "low"}
  ]
}

Be honest and specific. Scores should reflect real quality — don't just give high scores.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: imageBase64,
                },
              },
              {
                text: `${systemPrompt}\n\nAnalyze this YouTube thumbnail now and return JSON only.`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again shortly" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI analysis failed");
    }

    const aiData = await response.json();
    const content =
      aiData?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("\n") ||
      "";

    let scores;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      scores = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      console.error("Failed to parse scores:", content);
      throw new Error("Failed to parse AI response");
    }

    // Backward-compat field normalization for existing frontend type expectations.
    if (!scores.category_detected && scores.category) {
      scores.category_detected = scores.category;
    }
    if (Array.isArray(scores.improvements)) {
      scores.improvements = scores.improvements.map((item: any) => ({
        suggestion: item?.suggestion || item?.tip || "Improve thumbnail composition",
        priority: item?.priority || "medium",
      }));
    }

    if (!bypassCredits && creditData) {
      await supabase
        .from("user_credits")
        .update({ credits_remaining: creditData.credits_remaining - 1 })
        .eq("user_id", user.id);

      await supabase.from("credit_transactions").insert({
        user_id: user.id,
        action_type: "thumbnail_score",
        credits_deducted: 1,
        model_used: "gemini-2.5-flash",
      });
    }

    return new Response(JSON.stringify(scores), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    console.error("score-thumbnail error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

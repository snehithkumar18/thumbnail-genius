import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CREDIT_COST = 3;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      youtube_url,
      similarity_strength = 60,
      change_instruction = "",
      language_change = "original",
    } = body;

    if (!youtube_url) {
      return new Response(JSON.stringify({ error: "YouTube URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract video ID
    const videoIdMatch = youtube_url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (!videoIdMatch) {
      return new Response(JSON.stringify({ error: "Invalid YouTube URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const videoId = videoIdMatch[1];
    const originalThumbUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    // Check credits
    const { data: credits, error: creditsError } = await supabaseAdmin
      .from("user_credits")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (creditsError || !credits) {
      return new Response(JSON.stringify({ error: "Could not fetch credits" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (credits.credits_remaining < CREDIT_COST) {
      return new Response(
        JSON.stringify({ error: "Insufficient credits", credits_remaining: credits.credits_remaining, required: CREDIT_COST }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build instruction prompt
    const similarityLabel = similarity_strength <= 30
      ? "Keep only the general composition and theme, change everything else significantly"
      : similarity_strength <= 60
      ? "Keep a similar feel and layout, but make it noticeably different"
      : "Make it almost identical with only subtle changes";

    let languageInstruction = "";
    if (language_change && language_change !== "original") {
      languageInstruction = ` Translate any text in the image to ${language_change}.`;
    }

    // Enhance instruction via Lovable AI
    let enhancedInstruction = change_instruction || "Recreate this thumbnail in a fresh style";
    try {
      const enhanceResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `You are a YouTube thumbnail recreation expert. Rewrite this thumbnail recreation instruction for an AI image generator. Be specific about what to preserve (composition, layout, ${similarity_strength}% similarity) and what to change. ${similarityLabel}. Return ONLY the enhanced prompt, under 150 words.`,
            },
            {
              role: "user",
              content: `Original thumbnail: ${originalThumbUrl}. Changes requested: ${change_instruction || "Recreate in a fresh, eye-catching style"}.${languageInstruction}`,
            },
          ],
        }),
      });

      if (enhanceResp.ok) {
        const enhanceData = await enhanceResp.json();
        enhancedInstruction = enhanceData.choices?.[0]?.message?.content?.trim() || enhancedInstruction;
      }
    } catch (e) {
      console.error("Enhancement failed:", e);
    }

    const finalPrompt = `${enhancedInstruction}. YouTube thumbnail, 16:9 aspect ratio, eye-catching, high quality, professional.${languageInstruction}`;

    // Generate image
    const startTime = Date.now();
    const genResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: finalPrompt },
              { type: "image_url", image_url: { url: originalThumbUrl } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!genResp.ok) {
      const errText = await genResp.text();
      console.error("Generation error:", genResp.status, errText);
      if (genResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (genResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Generation failed: ${genResp.status}`);
    }

    const genData = await genResp.json();
    const base64Url = genData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!base64Url) throw new Error("No image returned from AI");

    const base64Data = base64Url.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const fileName = `${user.id}/${crypto.randomUUID()}.png`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("thumbnails")
      .upload(fileName, imageBytes, { contentType: "image/png", upsert: false });

    if (uploadError) throw new Error("Failed to upload image");

    const { data: publicUrlData } = supabaseAdmin.storage.from("thumbnails").getPublicUrl(fileName);
    const generationTime = Date.now() - startTime;

    const { data: thumbRecord, error: insertError } = await supabaseAdmin
      .from("thumbnails")
      .insert({
        user_id: user.id,
        image_url: publicUrlData.publicUrl,
        prompt: change_instruction || "Recreated from YouTube",
        enhanced_prompt: enhancedInstruction,
        model_used: "Recreate",
        style: `similarity-${similarity_strength}`,
        format_type: "16:9",
        generation_time_ms: generationTime,
      })
      .select("id")
      .single();

    if (insertError) throw new Error("Failed to save thumbnail");

    // Deduct credits
    await supabaseAdmin
      .from("user_credits")
      .update({
        credits_remaining: credits.credits_remaining - CREDIT_COST,
        credits_used_total: credits.credits_used_total + CREDIT_COST,
        credits_used_this_month: credits.credits_used_this_month + CREDIT_COST,
      })
      .eq("user_id", user.id);

    await supabaseAdmin.from("credit_transactions").insert({
      user_id: user.id,
      action_type: "recreate",
      credits_deducted: CREDIT_COST,
      model_used: "Recreate",
      thumbnail_id: thumbRecord.id,
    });

    return new Response(
      JSON.stringify({
        image_url: publicUrlData.publicUrl,
        thumbnail_id: thumbRecord.id,
        original_url: originalThumbUrl,
        credits_remaining: credits.credits_remaining - CREDIT_COST,
        enhanced_prompt: enhancedInstruction,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("recreate-thumbnail error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

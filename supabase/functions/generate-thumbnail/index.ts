import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CREDIT_COSTS: Record<string, number> = {
  fast: 1,
  pro: 2,
};

const STYLE_PROMPTS: Record<string, string> = {
  realistic: "photorealistic, high detail, natural lighting",
  cinematic: "cinematic look, anamorphic, dramatic shadows, film grain",
  "bold graphic": "bold graphic design, strong colors, flat illustration style",
  "dark dramatic": "dark moody atmosphere, dramatic rim lighting, deep shadows",
  minimal: "minimalist, clean, simple composition, negative space",
  anime: "anime art style, vibrant, Japanese animation aesthetic",
  "neon glow": "neon lighting, cyberpunk glow effects, dark background with neon accents",
  retro: "retro vintage aesthetic, 80s/90s color palette, nostalgic",
  luxury: "luxury premium feel, gold accents, elegant composition",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token
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

    // Create admin client for DB operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Create user client for auth verification
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
      prompt,
      enhance_prompt = true,
      text_overlay = false,
      text_content = "",
      style = "realistic",
      niche = "",
      format = "16:9",
      quality = "pro",
      count = 1,
      brand_kit_active = false,
      brand_kit = null,
    } = body;

    if (!prompt || prompt.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check credits
    const creditCost = (CREDIT_COSTS[quality] || 2) * count;
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

    if (credits.credits_remaining < creditCost) {
      return new Response(
        JSON.stringify({
          error: "Insufficient credits",
          credits_remaining: credits.credits_remaining,
          required: creditCost,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Enhance prompt via Lovable AI
    let finalPrompt = prompt;
    if (enhance_prompt) {
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
                content: `You are a YouTube thumbnail expert with deep knowledge of what drives clicks and views. Transform this basic description into a highly detailed image generation prompt. Include: specific lighting type (dramatic, cinematic, neon, etc), exact color palette, facial expression if person present (shocked, excited, confused, determined), background environment detail, composition style (rule of thirds, central subject), depth of field. If a style preset is given, incorporate it fully. Return ONLY the enhanced prompt text, nothing else. Keep it under 200 words.`,
              },
              {
                role: "user",
                content: `${prompt}. Style: ${style}. ${niche ? `Niche: ${niche}` : ""}`,
              },
            ],
          }),
        });

        if (enhanceResp.ok) {
          const enhanceData = await enhanceResp.json();
          finalPrompt = enhanceData.choices?.[0]?.message?.content?.trim() || prompt;
        }
      } catch (e) {
        console.error("Prompt enhancement failed, using original:", e);
      }
    }

    // Add style modifiers
    const styleModifier = STYLE_PROMPTS[style.toLowerCase()] || "";
    const aspectRatio = format === "9:16" ? "vertical portrait 9:16 aspect ratio" : "youtube thumbnail, 16:9 aspect ratio";
    
    let imagePrompt = `${finalPrompt}. ${styleModifier}. ${aspectRatio}, eye-catching, high quality, professional photography.`;

    if (text_overlay && text_content) {
      imagePrompt += ` Bold large text overlay saying "${text_content}" in high contrast, easily readable font.`;
    }

    if (brand_kit_active && brand_kit) {
      imagePrompt += ` Dominant color: ${brand_kit.primary_color}, accent: ${brand_kit.secondary_color}.`;
    }

    // Step 2: Generate images using Lovable AI image generation
    const results: Array<{
      image_url: string;
      thumbnail_id: string;
    }> = [];

    for (let i = 0; i < count; i++) {
      const startTime = Date.now();

      try {
        const imageModel = quality === "fast" 
          ? "google/gemini-2.5-flash-image" 
          : "google/gemini-3-pro-image-preview";

        const genResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: imageModel,
            messages: [
              {
                role: "user",
                content: imagePrompt,
              },
            ],
            modalities: ["image", "text"],
          }),
        });

        if (!genResp.ok) {
          const errText = await genResp.text();
          console.error("Image generation error:", genResp.status, errText);
          
          if (genResp.status === 429) {
            return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          if (genResp.status === 402) {
            return new Response(JSON.stringify({ error: "AI usage limit reached. Please try again later." }), {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          throw new Error(`Generation failed: ${genResp.status}`);
        }

        const genData = await genResp.json();
        const base64Url = genData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!base64Url) {
          throw new Error("No image returned from AI");
        }

        // Extract base64 data and upload to storage
        const base64Data = base64Url.replace(/^data:image\/\w+;base64,/, "");
        const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
        const fileName = `${user.id}/${crypto.randomUUID()}.png`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from("thumbnails")
          .upload(fileName, imageBytes, {
            contentType: "image/png",
            upsert: false,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw new Error("Failed to upload image");
        }

        const { data: publicUrlData } = supabaseAdmin.storage
          .from("thumbnails")
          .getPublicUrl(fileName);

        const publicUrl = publicUrlData.publicUrl;
        const generationTime = Date.now() - startTime;

        // Insert thumbnail record
        const { data: thumbRecord, error: insertError } = await supabaseAdmin
          .from("thumbnails")
          .insert({
            user_id: user.id,
            image_url: publicUrl,
            prompt: prompt,
            enhanced_prompt: finalPrompt,
            model_used: imageModel === "google/gemini-2.5-flash-image" ? "Schnell" : "Pro",
            style: style,
            format_type: format,
            generation_time_ms: generationTime,
          })
          .select("id")
          .single();

        if (insertError) {
          console.error("Insert error:", insertError);
          throw new Error("Failed to save thumbnail");
        }

        results.push({
          image_url: publicUrl,
          thumbnail_id: thumbRecord.id,
        });
      } catch (genErr) {
        console.error(`Generation ${i + 1} failed:`, genErr);
        // If first image fails, return error. Otherwise return what we have.
        if (results.length === 0) {
          return new Response(
            JSON.stringify({ error: genErr instanceof Error ? genErr.message : "Generation failed" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Deduct credits
    const perImageCost = CREDIT_COSTS[quality] || 2;
    const totalDeducted = perImageCost * results.length;

    await supabaseAdmin
      .from("user_credits")
      .update({
        credits_remaining: credits.credits_remaining - totalDeducted,
        credits_used_total: credits.credits_used_total + totalDeducted,
        credits_used_this_month: credits.credits_used_this_month + totalDeducted,
      })
      .eq("user_id", user.id);

    // Log transaction
    for (const result of results) {
      await supabaseAdmin.from("credit_transactions").insert({
        user_id: user.id,
        action_type: quality === "fast" ? "fast_generate" : "pro_generate",
        credits_deducted: perImageCost,
        model_used: quality === "fast" ? "Schnell" : "Pro",
        thumbnail_id: result.thumbnail_id,
      });
    }

    return new Response(
      JSON.stringify({
        images: results,
        credits_remaining: credits.credits_remaining - totalDeducted,
        enhanced_prompt: finalPrompt,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-thumbnail error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

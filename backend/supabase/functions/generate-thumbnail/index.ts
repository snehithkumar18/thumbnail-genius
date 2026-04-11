import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CREDIT_COSTS: Record<string, number> = {
  fast: 0,
  pro: 0,
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeDataUrlToBytes = (imageUrl: string): Uint8Array => {
  const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
  return Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
};

const extractFalImageUrl = (payload: any): string | null => {
  return (
    payload?.output?.images?.[0]?.url ||
    payload?.output?.image?.url ||
    payload?.images?.[0]?.url ||
    payload?.data?.images?.[0]?.url ||
    payload?.image?.url ||
    payload?.data?.image?.url ||
    null
  );
};

const runFalJob = async (modelPath: string, input: Record<string, unknown>, falApiKey: string) => {
  const submitResp = await fetch(`https://queue.fal.run/${modelPath}`, {
    method: "POST",
    headers: {
      "Authorization": `Key ${falApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input }),
  });

  if (!submitResp.ok) {
    const errText = await submitResp.text();
    throw new Error(`fal.ai submit failed (${submitResp.status}): ${errText}`);
  }

  const submitData = await submitResp.json();
  const requestId = submitData.request_id;
  const statusUrl = submitData.status_url || (requestId ? `https://queue.fal.run/${modelPath}/requests/${requestId}/status` : null);
  const responseUrl = submitData.response_url || (requestId ? `https://queue.fal.run/${modelPath}/requests/${requestId}` : null);

  if (!statusUrl) {
    return submitData;
  }

  for (let attempt = 0; attempt < 90; attempt += 1) {
    const statusResp = await fetch(statusUrl, {
      headers: { "Authorization": `Key ${falApiKey}` },
    });

    if (!statusResp.ok) {
      await sleep(1200);
      continue;
    }

    const statusData = await statusResp.json();
    const status = String(statusData?.status || "").toUpperCase();

    if (status.includes("COMPLETED") || status.includes("SUCCEEDED")) {
      if (responseUrl) {
        const finalResp = await fetch(responseUrl, {
          headers: { "Authorization": `Key ${falApiKey}` },
        });
        if (finalResp.ok) {
          return await finalResp.json();
        }
      }
      return statusData;
    }

    if (status.includes("FAILED") || status.includes("ERROR") || status.includes("CANCEL")) {
      throw new Error(statusData?.error || "fal.ai generation failed");
    }

    await sleep(1200);
  }

  throw new Error("fal.ai request timed out");
};

const enhanceWithGroq = async (groqApiKey: string, prompt: string, style: string, niche: string) => {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "You are a YouTube thumbnail image generation expert. Rewrite the user's brief into a detailed image-generation prompt including lighting, color palette, expression, background detail, and composition. Return only the enhanced prompt.",
        },
        {
          role: "user",
          content: `${prompt}. Style: ${style}. ${niche ? `Niche: ${niche}.` : ""}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq prompt enhancement failed (${response.status})`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || prompt;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[generate-thumbnail] START");
    const bypassCredits = Deno.env.get("BYPASS_CREDITS") === "true";
    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    // Prefer the legacy JWT keys we set manually, fall back to auto-provisioned
    const supabaseServiceKey = Deno.env.get("SB_SERVICE_ROLE_JWT") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    const falApiKey = Deno.env.get("FAL_KEY");
    const togetherApiKey = Deno.env.get("TOGETHER_API_KEY");

    console.log("[generate-thumbnail] ENV CHECK:", {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      serviceKeyPrefix: supabaseServiceKey?.substring(0, 10),
      hasGroq: !!groqApiKey,
      hasFal: !!falApiKey,
      hasTogether: !!togetherApiKey,
      bypassCredits,
    });

    if (!falApiKey) {
      throw new Error("FAL_KEY not configured");
    }

    const supabaseAnonKey =
      Deno.env.get("SB_ANON_JWT") ??
      Deno.env.get("SUPABASE_ANON_KEY") ??
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
      supabaseServiceKey;
    if (!supabaseAnonKey) {
      throw new Error("SUPABASE_ANON_KEY not configured");
    }

    // Create admin client for DB operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Create user client for auth verification
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    console.log("[generate-thumbnail] Verifying user auth...");
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      console.error("[generate-thumbnail] AUTH FAILED:", authError?.message);
      return new Response(JSON.stringify({ error: `[Auth Error]: ${authError?.message || "Invalid token"}`, detail: authError?.message }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("[generate-thumbnail] User verified:", user.id);

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
      language = null,
    } = body;

    // Language config
    const LANG_NAMES: Record<string, string> = {
      hi: "Hindi", hinglish: "Hinglish", ta: "Tamil", te: "Telugu",
      bn: "Bengali", es: "Spanish", pt: "Portuguese", ar: "Arabic",
    };
    const langName = language ? LANG_NAMES[language] : null;

    if (!prompt || prompt.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check credits (free for generation)
    const creditCost = (CREDIT_COSTS[quality] || 0) * count;
    let { data: credits, error: creditsError } = await supabaseAdmin
      .from("user_credits")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!credits) {
      const noRow = (creditsError as any)?.code === "PGRST116";
      if (creditsError && !noRow) {
        return new Response(JSON.stringify({ error: "Could not fetch credits" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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

      if (seedError) {
        return new Response(JSON.stringify({ error: "Could not initialize credits" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: hydratedCredits, error: hydratedCreditsError } = await supabaseAdmin
        .from("user_credits")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (hydratedCreditsError || !hydratedCredits) {
        return new Response(JSON.stringify({ error: "Could not fetch credits" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      credits = hydratedCredits;
    }

    if (!bypassCredits && creditCost > 0 && credits.credits_remaining < creditCost) {
      return new Response(
        JSON.stringify({
          error: "Insufficient credits",
          credits_remaining: credits.credits_remaining,
          required: creditCost,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Enhance prompt via Groq (Llama 3.3 70B)
    let finalPrompt = prompt;
    if (enhance_prompt && groqApiKey) {
      try {
        console.log("[generate-thumbnail] Enhancing prompt via Groq...");
        finalPrompt = await enhanceWithGroq(groqApiKey, prompt, style, niche);
        console.log("[generate-thumbnail] Prompt enhanced successfully");
      } catch (e) {
        console.error("[generate-thumbnail] Prompt enhancement failed, using original:", e);
      }
    }

    // Add style modifiers
    const styleModifier = STYLE_PROMPTS[style.toLowerCase()] || "";
    const aspectRatio = format === "9:16" ? "vertical portrait 9:16 aspect ratio" : "youtube thumbnail, 16:9 aspect ratio";
    
    let imagePrompt = `${finalPrompt}. ${styleModifier}. ${aspectRatio}, eye-catching, high quality, professional photography.`;

    if (text_overlay && text_content) {
      imagePrompt += ` Bold large text overlay saying "${text_content}" in high contrast, easily readable font.`;
      if (langName) {
        imagePrompt += ` Text in thumbnail must be in ${langName} script with correct native typography. Use authentic ${langName} font styling.`;
      }
    }

    if (brand_kit_active && brand_kit) {
      imagePrompt += ` Dominant color: ${brand_kit.primary_color}, accent: ${brand_kit.secondary_color}.`;
    }

    const hasTextOverlay = !!(text_overlay && text_content);
    const forceTextModel = !!(language && langName);
    const useIdeogram = hasTextOverlay || forceTextModel;
    const hasSubscriptionPlan = ["basic", "creator", "pro", "studio"].includes(credits.plan_type);

    // Step 2: Generate images using Lovable AI image generation
    const results: Array<{
      image_url: string;
      thumbnail_id: string;
    }> = [];

    for (let i = 0; i < count; i++) {
      const startTime = Date.now();

      try {
        let imageUrl: string | null = null;
        let modelUsed = "unknown";
        console.log("[generate-thumbnail] Generating image", { useIdeogram, quality, hasSubscriptionPlan });

        if (useIdeogram) {
          const falData = await runFalJob(
            "fal-ai/ideogram/v3",
            {
              prompt: imagePrompt,
              aspect_ratio: format === "9:16" ? "ASPECT_9_16" : "ASPECT_16_9",
              style_type: "REALISTIC",
              magic_prompt_option: "OFF",
            },
            falApiKey,
          );
          imageUrl = extractFalImageUrl(falData);
          modelUsed = "Ideogram 3.0";
        } else if (quality === "pro" && hasSubscriptionPlan) {
          const falData = await runFalJob(
            "fal-ai/flux-2-pro",
            {
              prompt: imagePrompt,
              image_size: format === "9:16" ? "portrait_9_16" : "landscape_16_9",
              output_format: "png",
            },
            falApiKey,
          );
          imageUrl = extractFalImageUrl(falData);
          modelUsed = "FLUX.2 Pro";
        } else {
          if (!togetherApiKey) {
            throw new Error("TOGETHER_API_KEY not configured");
          }
          const togetherResp = await fetch("https://api.together.xyz/v1/images/generations", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${togetherApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "black-forest-labs/FLUX.1-schnell",
              prompt: imagePrompt,
              width: format === "9:16" ? 720 : 1280,
              height: format === "9:16" ? 1280 : 720,
              steps: 4,
            }),
          });

          if (!togetherResp.ok) {
            const errText = await togetherResp.text();
            throw new Error(`Together AI failed (${togetherResp.status}): ${errText}`);
          }

          const togetherData = await togetherResp.json();
          const first = togetherData?.data?.[0];
          if (first?.url) imageUrl = first.url;
          if (!imageUrl && first?.b64_json) imageUrl = `data:image/png;base64,${first.b64_json}`;
          modelUsed = "FLUX.1 Schnell";
        }

        if (!imageUrl) {
          throw new Error("No image returned from provider");
        }

        let imageBytes: Uint8Array;
        if (imageUrl.startsWith("data:")) {
          imageBytes = normalizeDataUrlToBytes(imageUrl);
        } else {
          const imageFetch = await fetch(imageUrl);
          if (!imageFetch.ok) {
            throw new Error("Failed to download generated image");
          }
          imageBytes = new Uint8Array(await imageFetch.arrayBuffer());
        }

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
            model_used: modelUsed,
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
            JSON.stringify({ error: `[Generation Error]: ${genErr instanceof Error ? genErr.message : "Generation failed"}` }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Deduct credits (skipped when BYPASS_CREDITS=true)
    const perImageCost = CREDIT_COSTS[quality] || 0;
    const totalDeducted = perImageCost * results.length;

    if (!bypassCredits && totalDeducted > 0) {
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
          model_used: useIdeogram ? "Ideogram 3.0" : quality === "fast" ? "FLUX.1 Schnell" : hasSubscriptionPlan ? "FLUX.2 Pro" : "FLUX.1 Schnell",
          thumbnail_id: result.thumbnail_id,
        });
      }
    }

    const remainingCredits = bypassCredits ? credits.credits_remaining : credits.credits_remaining - totalDeducted;

    return new Response(
      JSON.stringify({
        images: results,
        credits_remaining: remainingCredits,
        enhanced_prompt: finalPrompt,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[generate-thumbnail] FATAL ERROR:", e instanceof Error ? e.message : e, e instanceof Error ? e.stack : "");
    return new Response(
      JSON.stringify({ error: `[Edge Function Error]: ${e instanceof Error ? e.message : "Unknown error"}`, stack: e instanceof Error ? e.stack : "" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

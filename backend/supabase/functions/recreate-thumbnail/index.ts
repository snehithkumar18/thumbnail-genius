import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildCacheKey,
  getCache,
  setCache,
  runImageProviders,
  loadImagePartFromUrl,
} from "../_shared/aiRouter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CREDIT_COST = 3;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

  if (!statusUrl) return submitData;

  for (let attempt = 0; attempt < 90; attempt += 1) {
    const statusResp = await fetch(statusUrl, { headers: { "Authorization": `Key ${falApiKey}` } });
    if (!statusResp.ok) {
      await sleep(1200);
      continue;
    }

    const statusData = await statusResp.json();
    const status = String(statusData?.status || "").toUpperCase();

    if (status.includes("COMPLETED") || status.includes("SUCCEEDED")) {
      if (responseUrl) {
        const finalResp = await fetch(responseUrl, { headers: { "Authorization": `Key ${falApiKey}` } });
        if (finalResp.ok) return await finalResp.json();
      }
      return statusData;
    }

    if (status.includes("FAILED") || status.includes("ERROR") || status.includes("CANCEL")) {
      throw new Error(statusData?.error || "fal.ai kontext failed");
    }

    await sleep(1200);
  }

  throw new Error("fal.ai kontext timed out");
};

const enhanceWithGroq = async (groqApiKey: string, instruction: string, similarity: number, sourceUrl: string) => {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content:
            "Rewrite the instruction for image-to-image thumbnail recreation. Keep composition control explicit and concise. Return only the enhanced instruction.",
        },
        {
          role: "user",
          content: `Source thumbnail: ${sourceUrl}. Similarity: ${similarity}%. User instruction: ${instruction}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq enhancement failed (${response.status})`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || instruction;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const bypassCredits = Deno.env.get("BYPASS_CREDITS") === "true";
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SB_SERVICE_ROLE_JWT") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    const falApiKey = Deno.env.get("FAL_KEY");

    const supabaseAnonKey =
      Deno.env.get("SB_ANON_JWT") ??
      Deno.env.get("SUPABASE_ANON_KEY") ??
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
      supabaseServiceKey;
    if (!supabaseAnonKey) {
      throw new Error("SUPABASE_ANON_KEY not configured");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: `[Auth Error]: ${authError?.message || "Invalid token"}`, detail: authError?.message }), {
        status: 200,
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
    const maxResThumbUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    const hqThumbUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    const maxResCheck = await fetch(maxResThumbUrl, { method: "HEAD" });
    const originalThumbUrl = maxResCheck.ok ? maxResThumbUrl : hqThumbUrl;

    // Check credits
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

    if (!bypassCredits && credits.credits_remaining < CREDIT_COST) {
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

    // Enhance instruction via Groq
    let enhancedInstruction = change_instruction || "Recreate this thumbnail in a fresh style";
    try {
      if (groqApiKey) {
        enhancedInstruction = await enhanceWithGroq(
          groqApiKey,
          `${change_instruction || "Recreate in a fresh, eye-catching style"}. ${similarityLabel}. ${languageInstruction}`,
          similarity_strength,
          originalThumbUrl,
        );
      }
    } catch (e) {
      console.error("Enhancement failed:", e);
    }

    const finalPrompt = `${enhancedInstruction}. Keep YouTube 16:9 framing and preserve recognizable layout intent. ${languageInstruction}`;

    const hasSubscriptionPlan = ["basic", "creator", "pro", "studio"].includes(credits.plan_type);
    const allowPaidFallback = hasSubscriptionPlan;

    const cacheKey = await buildCacheKey("recreate-thumbnail", {
      prompt: finalPrompt,
      originalThumbUrl,
      similarity_strength,
      language_change,
    });
    const inputHash = cacheKey.split(":").slice(2).join(":");
    const cached = await getCache(supabaseAdmin, cacheKey);

    const startTime = Date.now();
    let generatedImageUrl = cached?.image_url || null;
    let modelUsed = cached?.model_used || "unknown";
    let provider = cached?.provider || "cache";

    if (!generatedImageUrl) {
      const imagePart = await loadImagePartFromUrl(originalThumbUrl);
      const result = await runImageProviders(supabaseAdmin, {
        gemini: {
          prompt: finalPrompt,
          aspectRatio: "16:9",
          imageSize: "1K",
          images: [imagePart],
        },
        pollinations: {
          prompt: finalPrompt,
          width: 1280,
          height: 720,
          model: "kontext",
          imageUrl: originalThumbUrl,
        },
        allowPaidFallback,
        paidFallback: async () => {
          if (!falApiKey) throw new Error("FAL_KEY not configured");
          const falData = await runFalJob(
            "fal-ai/flux-pro/kontext",
            {
              prompt: finalPrompt,
              image_url: originalThumbUrl,
              strength: Math.max(0.1, Math.min(1, similarity_strength / 100)),
            },
            falApiKey,
          );

          const url = extractFalImageUrl(falData);
          if (!url) throw new Error("No image returned from FLUX Kontext");
          return { imageUrl: url, provider: "fal", modelUsed: "FLUX.1 Kontext Pro" };
        },
      });

      generatedImageUrl = result.imageUrl;
      modelUsed = result.modelUsed;
      provider = result.provider;
    }

    if (!generatedImageUrl) throw new Error("No image returned from provider");

    let publicUrl = generatedImageUrl;
    let generationTime = Date.now() - startTime;
    if (!cached) {
      const imageResp = await fetch(generatedImageUrl);
      if (!imageResp.ok) throw new Error("Failed to fetch recreated image");
      const imageBytes = new Uint8Array(await imageResp.arrayBuffer());
      const fileName = `${user.id}/${crypto.randomUUID()}.png`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("thumbnails")
        .upload(fileName, imageBytes, { contentType: "image/png", upsert: false });

      if (uploadError) throw new Error("Failed to upload image");

      const { data: publicUrlData } = supabaseAdmin.storage.from("thumbnails").getPublicUrl(fileName);
      publicUrl = publicUrlData.publicUrl;
      await setCache(supabaseAdmin, cacheKey, "recreate-thumbnail", inputHash, provider, modelUsed, publicUrl);
    } else {
      generationTime = 0;
    }

    const { data: thumbRecord, error: insertError } = await supabaseAdmin
      .from("thumbnails")
      .insert({
        user_id: user.id,
        image_url: publicUrl,
        prompt: change_instruction || "Recreated from YouTube",
        enhanced_prompt: enhancedInstruction,
        model_used: modelUsed,
        style: `similarity-${similarity_strength}`,
        format_type: "16:9",
        generation_time_ms: generationTime,
      })
      .select("id")
      .single();

    if (insertError) throw new Error("Failed to save thumbnail");

    if (!bypassCredits) {
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
        model_used: "FLUX.1 Kontext Pro",
        thumbnail_id: thumbRecord.id,
      });
    }

    const remainingCredits = bypassCredits ? credits.credits_remaining : credits.credits_remaining - CREDIT_COST;

    return new Response(
      JSON.stringify({
        image_url: publicUrl,
        thumbnail_id: thumbRecord.id,
        original_url: originalThumbUrl,
        credits_remaining: remainingCredits,
        enhanced_prompt: enhancedInstruction,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("recreate-thumbnail error:", e);
    return new Response(
      JSON.stringify({ error: `[Edge Function Error]: ${e instanceof Error ? e.message : "Unknown error"}`, stack: e instanceof Error ? e.stack : "" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

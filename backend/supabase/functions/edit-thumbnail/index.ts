import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildCacheKey,
  getCache,
  setCache,
  runImageProviders,
  loadImagePartFromUrl,
} from "./aiRouter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CREDIT_COST = 1;

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
      throw new Error(statusData?.error || "fal.ai edit failed");
    }

    await sleep(1200);
  }

  throw new Error("fal.ai edit timed out");
};

const enhanceWithGroq = async (groqApiKey: string, instruction: string) => {
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
            "Rewrite the image-edit instruction for a context-preserving image editor. Keep edits surgical and preserve composition unless explicitly asked otherwise. Return only the enhanced instruction.",
        },
        { role: "user", content: instruction },
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
    const supabaseServiceKey = (Deno.env.get("SB_SERVICE_ROLE_JWT") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!;
    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    const falApiKey = Deno.env.get("FAL_KEY");

    const supabaseAnonKey =
      (Deno.env.get("SB_ANON_JWT") ?? Deno.env.get("SUPABASE_ANON_KEY")) ??
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
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { current_image_url, edit_instruction, thumbnail_id } = body;

    if (!current_image_url || !edit_instruction) {
      return new Response(JSON.stringify({ error: "Image URL and edit instruction are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Enhance instruction with Groq
    let enhancedInstruction = edit_instruction;
    try {
      if (groqApiKey) {
        enhancedInstruction = await enhanceWithGroq(groqApiKey, edit_instruction);
      }
    } catch (e) {
      console.error("Enhancement failed:", e);
    }

    const hasSubscriptionPlan = ["basic", "creator", "pro", "studio"].includes(credits.plan_type);
    const allowPaidFallback = hasSubscriptionPlan;

    const cacheKey = await buildCacheKey("edit-thumbnail", {
      prompt: enhancedInstruction,
      current_image_url,
    });
    const inputHash = cacheKey.split(":").slice(2).join(":");
    const cached = await getCache(supabaseAdmin, cacheKey);

    const startTime = Date.now();
    let editedImageUrl = cached?.image_url || null;
    let modelUsed = cached?.model_used || "unknown";
    let provider = cached?.provider || "cache";

    if (!editedImageUrl) {
      const imagePart = await loadImagePartFromUrl(current_image_url);
      const result = await runImageProviders(supabaseAdmin, {
        gemini: {
          prompt: enhancedInstruction,
          aspectRatio: "16:9",
          imageSize: "1K",
          images: [imagePart],
        },
        pollinations: {
          prompt: enhancedInstruction,
          width: 1280,
          height: 720,
          model: "kontext",
          imageUrl: current_image_url,
        },
        allowPaidFallback,
        paidFallback: async () => {
          if (!falApiKey) throw new Error("FAL_KEY not configured");
          const falData = await runFalJob(
            "fal-ai/flux-pro/kontext",
            {
              prompt: enhancedInstruction,
              image_url: current_image_url,
              strength: 0.7,
            },
            falApiKey,
          );

          const url = extractFalImageUrl(falData);
          if (!url) throw new Error("No image returned from FLUX Kontext");
          return { imageUrl: url, provider: "fal", modelUsed: "FLUX.1 Kontext Pro" };
        },
      });

      editedImageUrl = result.imageUrl;
      modelUsed = result.modelUsed;
      provider = result.provider;
    }

    if (!editedImageUrl) throw new Error("No image returned from provider");

    let publicUrl = editedImageUrl;
    let generationTime = Date.now() - startTime;
    if (!cached) {
      const imageResp = await fetch(editedImageUrl);
      if (!imageResp.ok) throw new Error("Failed to fetch edited image");
      const imageBytes = new Uint8Array(await imageResp.arrayBuffer());
      const fileName = `${user.id}/${crypto.randomUUID()}.png`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("thumbnails")
        .upload(fileName, imageBytes, { contentType: "image/png", upsert: false });

      if (uploadError) throw new Error("Failed to upload image");

      const { data: publicUrlData } = supabaseAdmin.storage.from("thumbnails").getPublicUrl(fileName);
      publicUrl = publicUrlData.publicUrl;
      await setCache(supabaseAdmin, cacheKey, "edit-thumbnail", inputHash, provider, modelUsed, publicUrl);
    } else {
      generationTime = 0;
    }

    // Save as new thumbnail (edited version)
    const { data: thumbRecord, error: insertError } = await supabaseAdmin
      .from("thumbnails")
      .insert({
        user_id: user.id,
        image_url: publicUrl,
        prompt: edit_instruction,
        enhanced_prompt: enhancedInstruction,
        model_used: modelUsed,
        style: "edited",
        format_type: "16:9",
        generation_time_ms: generationTime,
      })
      .select("id")
      .single();

    if (insertError) throw new Error("Failed to save edited thumbnail");

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
        action_type: "ai_edit",
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
        credits_remaining: remainingCredits,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("edit-thumbnail error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

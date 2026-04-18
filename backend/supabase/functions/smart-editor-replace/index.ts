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

const SMART_EDITOR_CREDITS: Record<string, number> = {
  AUTO_DETECT: 0,
  REPLACE_TEXT: 5,
  REPLACE_BACKGROUND: 6,
  REPLACE_PERSON: 7,
  REPLACE_OBJECT: 6,
  UPSCALE_4K: 2,
};

const SMART_EDITOR_API_COSTS_USD: Record<string, number> = {
  AUTO_DETECT: 0.006,
  REPLACE_TEXT: 0.046,
  REPLACE_BACKGROUND: 0.056,
  REPLACE_PERSON: 0.064,
  REPLACE_OBJECT: 0.046,
  UPSCALE_4K: 0.002,
};

const extractFalImageUrl = (payload: any): string | null => {
  return (
    payload?.output?.images?.[0]?.url ||
    payload?.output?.image?.url ||
    payload?.images?.[0]?.url ||
    payload?.data?.images?.[0]?.url ||
    payload?.image?.url ||
    payload?.data?.image?.url ||
    payload?.image ||
    null
  );
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SB_SERVICE_ROLE_JWT") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SB_ANON_JWT") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? supabaseServiceKey;
    const falApiKey = Deno.env.get("FAL_KEY");

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const {
      session_id,
      layer_id,
      edit_type,
      current_image_url,
      instruction,
      replacement_image_url,
      user_id
    } = await req.json();

    if (user.id !== user_id) {
        return new Response(JSON.stringify({ error: "Unauthorized user" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const costKey = edit_type.toUpperCase();
    const creditCost = SMART_EDITOR_CREDITS[costKey] || 0;
    const apiCost = SMART_EDITOR_API_COSTS_USD[costKey] || 0;

    // Check credits manually just to be safe
    const { data: creditsData } = await supabaseAdmin
        .from('user_credits')
        .select('*')
        .eq('user_id', user.id)
        .single();
    
    if (!creditsData || creditsData.credits_remaining < creditCost) {
        return new Response(JSON.stringify({ error: "Insufficient credits" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const hasSubscriptionPlan = ["basic", "creator", "pro", "studio"].includes(creditsData.plan_type);
    const allowPaidFallback = hasSubscriptionPlan;

    const cacheKey = await buildCacheKey("smart-editor-replace", {
      edit_type,
      instruction,
      current_image_url,
      replacement_image_url,
    });
    const inputHash = cacheKey.split(":").slice(2).join(":");
    const cached = await getCache(supabaseAdmin, cacheKey);

    let resultImageUrl = cached?.image_url || null;
    let modelUsed = cached?.model_used || "unknown";
    let provider = cached?.provider || "cache";

    if (!resultImageUrl) {
      const baseImage = await loadImagePartFromUrl(current_image_url);
      const images = replacement_image_url
        ? [baseImage, await loadImagePartFromUrl(replacement_image_url)]
        : [baseImage];

      const pollinationsPrompt = replacement_image_url
        ? `${instruction} Reference image: ${replacement_image_url}`
        : instruction;

      const result = await runImageProviders(supabaseAdmin, {
        gemini: {
          prompt: instruction,
          aspectRatio: "16:9",
          imageSize: "1K",
          images,
        },
        pollinations: {
          prompt: pollinationsPrompt,
          width: 1280,
          height: 720,
          model: "kontext",
          imageUrl: current_image_url,
        },
        allowPaidFallback,
        paidFallback: async () => {
          if (!falApiKey) throw new Error("FAL_KEY not configured");

          let modelPath = "";
          let falInput: Record<string, unknown> = {};

          if (edit_type === "replace_text") {
            modelPath = "fal-ai/flux-pro/kontext";
            falInput = { prompt: instruction, image_url: current_image_url, strength: 0.85 };
          } else if (edit_type === "replace_background") {
            modelPath = "fal-ai/flux-pro/kontext";
            falInput = { prompt: instruction, image_url: current_image_url, strength: 0.9 };
          } else if (edit_type === "replace_person") {
            if (replacement_image_url) {
              modelPath = "fal-ai/hy-wu";
              falInput = { image_url: current_image_url, reference_image_url: replacement_image_url, task: "face_swap" };
            } else {
              modelPath = "fal-ai/flux-pro/kontext";
              falInput = { prompt: instruction, image_url: current_image_url, strength: 0.85 };
            }
          } else if (edit_type === "replace_object") {
            modelPath = "fal-ai/flux-pro/kontext";
            falInput = { prompt: instruction, image_url: current_image_url, strength: 0.8 };
          } else {
            throw new Error("Invalid edit type");
          }

          const runResp = await fetch(`https://fal.run/${modelPath}`, {
            method: "POST",
            headers: {
              "Authorization": `Key ${falApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(falInput),
          });

          if (!runResp.ok) {
            console.error("Fal request failed:", await runResp.text());
            throw new Error("Fal API failed");
          }

          const falData = await runResp.json();
          const url = extractFalImageUrl(falData) || falData.image?.url || falData.image;
          if (!url) throw new Error("No image returned from Fal API");
          return { imageUrl: url, provider: "fal", modelUsed: modelPath };
        }
      });

      resultImageUrl = result.imageUrl;
      modelUsed = result.modelUsed;
      provider = result.provider;
    }

    if (!resultImageUrl) throw new Error("No image returned from provider");

    // Upload to Supabase Storage
    let finalImageUrl = resultImageUrl;
    if (!cached) {
      let imageBytes: Uint8Array;
      if (resultImageUrl.startsWith("data:")) {
        const base64Data = resultImageUrl.replace(/^data:image\/\w+;base64,/, "");
        imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      } else {
        const imageFetch = await fetch(resultImageUrl);
        imageBytes = new Uint8Array(await imageFetch.arrayBuffer());
      }

      const timestamp = Date.now();
      const fileName = `${user.id}/${session_id}/edit_${timestamp}.png`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("smart_editor")
        .upload(fileName, imageBytes, { contentType: "image/png" });
        
      // We can proceed even if it fails the upload and just use fal URL, but saving to storage is better.
      if (!uploadError) {
        const { data: signedData, error: signedError } = await supabaseAdmin.storage
          .from("smart_editor")
          .createSignedUrl(fileName, 60 * 60);

        if (!signedError && signedData?.signedUrl) {
          finalImageUrl = signedData.signedUrl;
        } else {
          const { data: publicUrlData } = supabaseAdmin.storage
            .from("smart_editor")
            .getPublicUrl(fileName);
          finalImageUrl = publicUrlData.publicUrl;
        }
      }

      await setCache(supabaseAdmin, cacheKey, "smart-editor-replace", inputHash, provider, modelUsed, finalImageUrl);
    }

    // Save to smart_editor_edits
    await supabaseAdmin.from('smart_editor_edits').insert({
        session_id, user_id, layer_id, edit_type, instruction,
        before_image_url: current_image_url,
        after_image_url: finalImageUrl,
        credits_charged: creditCost,
        api_cost_usd: apiCost
    });

    // Update session
    const { data: session } = await supabaseAdmin.from('smart_editor_sessions')
        .select('credits_used')
        .eq('id', session_id)
        .single();

    await supabaseAdmin.from('smart_editor_sessions')
        .update({
            current_image_url: finalImageUrl,
            credits_used: (session?.credits_used || 0) + creditCost
        })
        .eq('id', session_id);

    // Deduct credits via user_credits directly to avoid function invocation overhead and permission issues.
    if (creditCost > 0) {
        await supabaseAdmin.from('user_credits')
            .update({
                credits_remaining: creditsData.credits_remaining - creditCost,
                credits_used_total: (creditsData.credits_used_total || 0) + creditCost
            })
            .eq('user_id', user.id);
    }

    return new Response(
      JSON.stringify({ result_image_url: finalImageUrl, credits_remaining: creditsData.credits_remaining - creditCost }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

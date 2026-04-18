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
      await sleep(1000);
      continue;
    }

    const statusData = await statusResp.json();
    const status = String(statusData?.status || "").toUpperCase();

    if (status.includes("COMPLETED") || status.includes("SUCCEEDED")) {
      if (responseUrl) {
        const finalResp = await fetch(responseUrl, { headers: { "Authorization": `Key ${falApiKey}` } });
        if (finalResp.ok) {
          return await finalResp.json();
        }
      }
      return statusData;
    }

    if (status.includes("FAILED") || status.includes("ERROR") || status.includes("CANCEL")) {
      throw new Error(statusData?.error || "fal.ai face swap failed");
    }

    await sleep(1000);
  }

  throw new Error("fal.ai face swap timed out");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const bypassCredits = Deno.env.get("BYPASS_CREDITS") === "true";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SB_SERVICE_ROLE_JWT") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const falApiKey = Deno.env.get("FAL_KEY");

    const hasFal = !!falApiKey;

    const authHeader = req.headers.get("Authorization");
    const supabaseAnonKey = Deno.env.get("SB_ANON_JWT") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    if (!supabaseAnonKey) {
      throw new Error("SUPABASE_ANON_KEY not configured");
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader?.replace("Bearer ", "") || ""
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { face_url, target_url } = await req.json();
    if (!face_url || !target_url) {
      return new Response(JSON.stringify({ error: "face_url and target_url are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Credit check
    let { data: credits, error: creditsError } = await supabase
      .from("user_credits")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!credits) {
      const noRow = (creditsError as any)?.code === "PGRST116";
      if (!creditsError || noRow) {
        const { error: seedError } = await supabase
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
            .select("*")
            .eq("user_id", user.id)
            .single();
          credits = hydratedCredits;
        }
      }
    }

    if (!bypassCredits && (!credits || credits.credits_remaining < 3)) {
      return new Response(JSON.stringify({ error: "Insufficient credits", code: "NO_CREDITS" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hasSubscriptionPlan = ["basic", "creator", "pro", "studio"].includes(credits?.plan_type);
    const allowPaidFallback = !!hasSubscriptionPlan;

    const cacheKey = await buildCacheKey("face-swap", { target_url, face_url });
    const inputHash = cacheKey.split(":").slice(2).join(":");
    const cached = await getCache(supabase, cacheKey);

    let imageUrl = cached?.image_url || null;
    let modelUsed = cached?.model_used || "unknown";
    let provider = cached?.provider || "cache";

    if (!imageUrl) {
      const baseImage = await loadImagePartFromUrl(target_url);
      const faceImage = await loadImagePartFromUrl(face_url);
      const prompt = "Replace the face of the person in the first image with the face from the second image. Keep pose, lighting, and background unchanged.";

      const result = await runImageProviders(supabase, {
        gemini: {
          prompt,
          aspectRatio: "16:9",
          imageSize: "1K",
          images: [baseImage, faceImage],
        },
        pollinations: {
          prompt: `${prompt} Reference face url: ${face_url}`,
          width: 1280,
          height: 720,
          model: "kontext",
          imageUrl: target_url,
        },
        allowPaidFallback,
        paidFallback: async () => {
          if (!hasFal) throw new Error("FAL_KEY not configured");
          const modelPath = "fal-ai/hy-wu-edit";
          const hyWuEdit = await runFalJob(
            modelPath,
            {
              prompt,
              image_urls: [target_url, face_url],
            },
            falApiKey,
          );
          const url = extractFalImageUrl(hyWuEdit);
          if (!url) throw new Error("HY-WU edit returned no image");
          return { imageUrl: url, provider: "fal", modelUsed: "fal-ai/hy-wu-edit" };
        },
      });

      imageUrl = result.imageUrl;
      modelUsed = result.modelUsed;
      provider = result.provider;
    }

    if (!imageUrl) throw new Error("Face swap returned no image");

    let publicUrl = imageUrl;
    if (!cached) {
      const imageResp = await fetch(imageUrl);
      if (!imageResp.ok) {
        throw new Error("Failed to fetch face-swap image");
      }
      const imageBytes = new Uint8Array(await imageResp.arrayBuffer());
      const fileName = `${user.id}/faceswap/${crypto.randomUUID()}.png`;

      const { error: uploadError } = await supabase.storage
        .from("thumbnails")
        .upload(fileName, imageBytes, { contentType: "image/png" });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("thumbnails").getPublicUrl(fileName);
      publicUrl = urlData.publicUrl;
      await setCache(supabase, cacheKey, "face-swap", inputHash, provider, modelUsed, publicUrl);
    }

    // Save thumbnail
    const { data: thumbnail, error: insertError } = await supabase
      .from("thumbnails")
      .insert({
        user_id: user.id,
        image_url: publicUrl,
        prompt: "Face swap",
        model_used: modelUsed,
        format_type: "16:9",
        style: "face-swap",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    if (!bypassCredits && credits) {
      await supabase.from("credit_transactions").insert({
        user_id: user.id,
        action_type: "face_swap",
        credits_deducted: 3,
        thumbnail_id: thumbnail.id,
        model_used: modelUsed,
      });

      await supabase
        .from("user_credits")
        .update({
          credits_remaining: credits.credits_remaining - 3,
          credits_used_this_month: (credits as any).credits_used_this_month + 3,
          credits_used_total: (credits as any).credits_used_total + 3,
        })
        .eq("user_id", user.id);
    }

    const remainingCredits = bypassCredits
      ? (credits?.credits_remaining ?? 0)
      : ((credits?.credits_remaining ?? 0) - 3);

    return new Response(
      JSON.stringify({
        image_url: publicUrl,
        thumbnail_id: thumbnail.id,
        credits_remaining: remainingCredits,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: `[Edge Function Error]: ${message}` }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

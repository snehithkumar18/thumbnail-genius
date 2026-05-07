import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const CACHE_TTL_HOURS = 12;
const RATE_LIMIT_SECONDS = 10;

const stableStringify = (value: unknown): string => {
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      return Object.keys(val as Record<string, unknown>)
        .sort()
        .reduce((acc, key) => {
          (acc as Record<string, unknown>)[key] = (val as Record<string, unknown>)[key];
          return acc;
        }, {} as Record<string, unknown>);
    }
    return val;
  });
};

const sha256Hex = async (input: string): Promise<string> => {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const buildCacheKey = async (feature: string, parts: Record<string, unknown>): Promise<string> => {
  const payload = stableStringify({ feature, ...parts });
  const hash = await sha256Hex(payload);
  return `v1:${feature}:${hash}`;
};

const getCache = async (supabaseAdmin: ReturnType<typeof createClient>, cacheKey: string) => {
  const { data } = await supabaseAdmin
    .from("ai_generation_cache")
    .select("image_url, provider, model_used, expires_at")
    .eq("cache_key", cacheKey)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!data) return null;
  return { image_url: data.image_url, provider: data.provider, model_used: data.model_used };
};

const setCache = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  cacheKey: string,
  feature: string,
  inputHash: string,
  provider: string,
  modelUsed: string,
  imageUrl: string,
  ttlHours: number = CACHE_TTL_HOURS,
) => {
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
  await supabaseAdmin.from("ai_generation_cache").upsert({
    cache_key: cacheKey,
    feature,
    input_hash: inputHash,
    provider,
    model_used: modelUsed,
    image_url: imageUrl,
    expires_at: expiresAt,
  });
};

const checkRateLimit = async (supabaseAdmin: ReturnType<typeof createClient>, key: string) => {
  const { data } = await supabaseAdmin
    .from("ai_provider_status")
    .select("last_rate_limit_at")
    .eq("provider", key)
    .maybeSingle();

  if (!data?.last_rate_limit_at) return false;
  const last = new Date(data.last_rate_limit_at).getTime();
  return Date.now() - last < RATE_LIMIT_SECONDS * 1000;
};

const touchRateLimit = async (supabaseAdmin: ReturnType<typeof createClient>, key: string) => {
  await supabaseAdmin.from("ai_provider_status").upsert({
    provider: key,
    last_rate_limit_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
};

const extractTaskId = (payload: any): string | null => {
  return (
    payload?.task_id ||
    payload?.taskId ||
    payload?.job_id ||
    payload?.jobId ||
    payload?.id ||
    payload?.data?.task_id ||
    payload?.data?.taskId ||
    payload?.data?.job_id ||
    payload?.data?.jobId ||
    payload?.data?.id ||
    null
  );
};

const extractResultUrl = (payload: any): string | null => {
  return (
    payload?.result_url ||
    payload?.output?.url ||
    payload?.output?.image?.url ||
    payload?.output?.images?.[0]?.url ||
    payload?.data?.result_url ||
    payload?.data?.output?.url ||
    payload?.data?.image_url ||
    payload?.image_url ||
    null
  );
};

const isDoneStatus = (status?: string) => {
  const s = String(status || "").toLowerCase();
  return ["completed", "succeeded", "success", "done"].includes(s);
};

const runLocalFaceSwap = async (editorServiceUrl: string, sourceUrl: string, targetUrl: string) => {
  const resp = await fetch(`${editorServiceUrl}/face-swap`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source_url: sourceUrl,
      target_url: targetUrl,
      strength: 1.0,
    }),
  });

  if (!resp.ok) {
    throw new Error(`Local face swap failed (${resp.status}): ${await resp.text()}`);
  }

  const result = await resp.json();
  return result.image_base64; // Returns base64 encoded image
};

const mapFaceSwapError = (message: string) => {
  if (message.includes("No face detected")) {
    return { code: "NO_FACE_DETECTED", message: "No face detected in one or both images" };
  }
  if (message.includes("timeout")) {
    return { code: "TIMEOUT", message: "Face swap processing took too long. Try again." };
  }
  return { code: "FACESWAP_ERROR", message: message || "Face swap request failed" };
};

const loadImageBytes = async (imageUrl: string): Promise<Uint8Array> => {
  if (imageUrl.startsWith("data:")) {
    const commaIndex = imageUrl.indexOf(",");
    if (commaIndex === -1) throw new Error("Invalid data URL for face-swap image");
    const base64 = imageUrl.slice(commaIndex + 1);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  const imageResp = await fetch(imageUrl);
  if (!imageResp.ok) {
    throw new Error(`Failed to fetch face-swap image (${imageResp.status})`);
  }
  return new Uint8Array(await imageResp.arrayBuffer());
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const bypassCredits = Deno.env.get("BYPASS_CREDITS") === "true";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SB_SERVICE_ROLE_JWT") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const facemintApiKey = Deno.env.get("FACEMINT_API_KEY");
    const facemintBaseUrl = Deno.env.get("FACEMINT_API_BASE") || "https://api.facemint.ai";

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

    if (!bypassCredits && (!credits || credits.credits_remaining < 1)) {
      return new Response(JSON.stringify({ error: "Insufficient credits", code: "NO_CREDITS" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use local free face swap service (InsightFace + inswapper_128.onnx)
    const editorServiceUrl = Deno.env.get("EDITOR_SERVICE_URL") || "http://localhost:8000";

    const rateKey = `faceswap:${user.id}`;
    if (await checkRateLimit(supabase, rateKey)) {
      return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment.", code: "RATE_LIMIT" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    await touchRateLimit(supabase, rateKey);

    const cacheKey = await buildCacheKey("face-swap", { target_url, face_url });
    const inputHash = cacheKey.split(":").slice(2).join(":");
    const cached = await getCache(supabase, cacheKey);

    let imageBase64 = "";
    let modelUsed = cached?.model_used || "unknown";
    let provider = cached?.provider || "cache";

    if (!cached?.image_url) {
      try {
        imageBase64 = await runLocalFaceSwap(editorServiceUrl, face_url, target_url);
      } catch (err: unknown) {
        const rawMessage = err instanceof Error ? err.message : "Face swap request failed";
        const mapped = mapFaceSwapError(rawMessage);
        return new Response(JSON.stringify({ error: mapped.message, code: mapped.code }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      modelUsed = "insightface-inswapper";
      provider = "local";
    }

    let publicUrl = cached?.image_url || "";

    if (!publicUrl) {
      // Convert base64 to Uint8Array and upload
      const binaryString = atob(imageBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i += 1) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const fileName = `${user.id}/faceswap/${crypto.randomUUID()}.png`;

      const { error: uploadError } = await supabase.storage
        .from("thumbnails")
        .upload(fileName, bytes, { contentType: "image/png" });

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
        credits_deducted: 1,
        thumbnail_id: thumbnail.id,
        model_used: modelUsed,
      });

      await supabase
        .from("user_credits")
        .update({
          credits_remaining: credits.credits_remaining - 1,
          credits_used_this_month: (credits as any).credits_used_this_month + 1,
          credits_used_total: (credits as any).credits_used_total + 1,
        })
        .eq("user_id", user.id);
    }

    const remainingCredits = bypassCredits
      ? (credits?.credits_remaining ?? 0)
      : ((credits?.credits_remaining ?? 0) - 1);

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

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encodeBase64 } from "https://deno.land/std@0.203.0/encoding/base64.ts";

type CacheEntry = {
  image_url: string;
  provider: string;
  model_used: string;
};

type ImagePart = {
  data: string;
  mimeType: string;
};

type GeminiRequest = {
  prompt: string;
  aspectRatio: "16:9" | "9:16";
  imageSize?: "1K" | "2K";
  images?: ImagePart[];
};

type PollinationsRequest = {
  prompt: string;
  width: number;
  height: number;
  imageUrl?: string;
  model: "flux" | "kontext";
};

type ProviderResult = {
  imageUrl: string;
  provider: string;
  modelUsed: string;
};

type ProviderOptions = {
  gemini?: GeminiRequest;
  pollinations?: PollinationsRequest;
  allowPaidFallback: boolean;
  paidFallback?: () => Promise<ProviderResult>;
};

const GEMINI_MODEL = "gemini-2.5-flash-image";
const CACHE_TTL_HOURS = 12;
const CACHE_MAX_ENTRIES = 10000;
const RATE_LIMIT_COOLDOWN_MINUTES = 60;

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

export const buildCacheKey = async (feature: string, parts: Record<string, unknown>): Promise<string> => {
  const payload = stableStringify({ feature, ...parts });
  const hash = await sha256Hex(payload);
  return `v1:${feature}:${hash}`;
};

export const getCache = async (supabaseAdmin: SupabaseClient, cacheKey: string): Promise<CacheEntry | null> => {
  const { data } = await supabaseAdmin
    .from("ai_generation_cache")
    .select("image_url, provider, model_used, expires_at")
    .eq("cache_key", cacheKey)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!data) return null;
  return { image_url: data.image_url, provider: data.provider, model_used: data.model_used };
};

const cleanupCache = async (supabaseAdmin: SupabaseClient) => {
  await supabaseAdmin.from("ai_generation_cache").delete().lt("expires_at", new Date().toISOString());

  const { count } = await supabaseAdmin
    .from("ai_generation_cache")
    .select("cache_key", { count: "exact", head: true });

  if (!count || count <= CACHE_MAX_ENTRIES) return;

  const over = count - CACHE_MAX_ENTRIES;
  const { data: oldRows } = await supabaseAdmin
    .from("ai_generation_cache")
    .select("cache_key")
    .order("created_at", { ascending: true })
    .limit(over);

  if (oldRows && oldRows.length > 0) {
    const keys = oldRows.map((row) => row.cache_key);
    await supabaseAdmin.from("ai_generation_cache").delete().in("cache_key", keys);
  }
};

export const setCache = async (
  supabaseAdmin: SupabaseClient,
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

  await cleanupCache(supabaseAdmin);
};

const isRateLimitError = (status: number, message: string) => {
  const lower = message.toLowerCase();
  return status === 429 || lower.includes("resource_exhausted") || lower.includes("exceeded your current quota");
};

const isProviderCoolingDown = async (supabaseAdmin: SupabaseClient, provider: string) => {
  const { data } = await supabaseAdmin
    .from("ai_provider_status")
    .select("last_rate_limit_at")
    .eq("provider", provider)
    .maybeSingle();

  if (!data?.last_rate_limit_at) return false;
  const last = new Date(data.last_rate_limit_at).getTime();
  const cooldownMs = RATE_LIMIT_COOLDOWN_MINUTES * 60 * 1000;
  return Date.now() - last < cooldownMs;
};

const markProviderRateLimited = async (supabaseAdmin: SupabaseClient, provider: string) => {
  await supabaseAdmin.from("ai_provider_status").upsert({
    provider,
    last_rate_limit_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
};

const fetchImageAsBase64 = async (imageUrl: string): Promise<ImagePart> => {
  const resp = await fetch(imageUrl);
  if (!resp.ok) {
    throw new Error("Failed to fetch image for Gemini");
  }
  const mimeType = resp.headers.get("content-type") || "image/jpeg";
  const bytes = new Uint8Array(await resp.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
  }
  const data = btoa(binary);
  return { data, mimeType };
};

const callGeminiImage = async (req: GeminiRequest, apiKey: string): Promise<ProviderResult> => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const parts = [] as Array<{ text?: string; inlineData?: ImagePart }>;

  if (req.images && req.images.length > 0) {
    req.images.forEach((img) => parts.push({ inlineData: img }));
  }
  parts.push({ text: req.prompt });

  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ],
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gemini error (${resp.status}): ${errText}`);
  }

  const data = await resp.json();
  const partsOut = data?.candidates?.[0]?.content?.parts || [];
  const inline = partsOut.find((p: any) => p.inlineData || p.inline_data)?.inlineData || partsOut.find((p: any) => p.inline_data)?.inline_data;

  if (!inline?.data) {
    throw new Error("Gemini returned no image");
  }

  const imageUrl = `data:${inline.mimeType || "image/png"};base64,${inline.data}`;
  return { imageUrl, provider: "gemini", modelUsed: GEMINI_MODEL };
};

const callPollinationsImage = async (req: PollinationsRequest): Promise<ProviderResult> => {
  const hfToken = Deno.env.get("HF_TOKEN") || Deno.env.get("HUGGING_FACE_HUB_TOKEN") || "";
  if (!hfToken) {
    throw new Error("Hugging Face token not configured. Please set HF_TOKEN environment variable.");
  }

  // TEMPORARILY: Only use Stable Diffusion 3 (no fallback to FLUX) for testing quality
  const models = [
    { id: "stabilityai/stable-diffusion-3-medium-diffusers", name: "Stable Diffusion 3 (HF)" }
  ];

  let lastErr = "";
  for (const model of models) {
    try {
      console.log(`[aiRouter] Calling Hugging Face Serverless model: ${model.id}...`);
      const response = await fetch(`https://router.huggingface.co/hf-inference/models/${model.id}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${hfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: req.prompt }),
      });

      if (response.ok) {
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const base64 = encodeBase64(bytes);
        const mimeType = response.headers.get("content-type") || "image/jpeg";
        const imageUrl = `data:${mimeType};base64,${base64}`;

        return { imageUrl, provider: "huggingface", modelUsed: model.name };
      } else {
        const errText = await response.text();
        lastErr = `Model ${model.id} failed (${response.status}): ${errText}`;
        console.warn(`[aiRouter] Hugging Face model ${model.id} failed:`, lastErr);
      }
    } catch (e) {
      lastErr = `Fetch error for Hugging Face model ${model.id}: ${e instanceof Error ? e.message : String(e)}`;
      console.error(`[aiRouter] Hugging Face fetch failed for ${model.id}:`, lastErr);
    }
  }

  throw new Error(`All Hugging Face models failed. Last error: ${lastErr}`);
};

export const runImageProviders = async (
  supabaseAdmin: SupabaseClient,
  options: ProviderOptions,
): Promise<ProviderResult> => {
  const geminiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY") || "";
  let geminiError = "Gemini key not configured or disabled.";
  let hfError = "Hugging Face disabled.";

  // 1. Always try Gemini first if key is available
  if (geminiKey && options.gemini) {
    const cooling = await isProviderCoolingDown(supabaseAdmin, "gemini");
    if (!cooling) {
      try {
        console.log("[aiRouter] Attempting Gemini (gemini-2.5-flash-image)...");
        return await callGeminiImage(options.gemini, geminiKey);
      } catch (e: unknown) {
        geminiError = e instanceof Error ? e.message : String(e);
        console.error("[aiRouter] Gemini failed:", geminiError);

        // Detect rate limit / quota exhaustion
        const statusMatch = geminiError.match(/\((\d{3})\)/);
        const status = statusMatch ? Number(statusMatch[1]) : 0;
        if (isRateLimitError(status, geminiError)) {
          await markProviderRateLimited(supabaseAdmin, "gemini");
          console.warn("[aiRouter] Gemini quota exhausted. Falling back to Pollinations.");
        }
        // Fall through to Pollinations
      }
    } else {
      geminiError = "Gemini is cooling down (quota exhausted).";
      console.warn("[aiRouter] Gemini is cooling down (quota exhausted). Using Pollinations.");
    }
  }

  // 2. Fallback to Pollinations
  if (options.pollinations) {
    try {
      console.log("[aiRouter] Using Pollinations as fallback.");
      return await callPollinationsImage(options.pollinations);
    } catch (e: unknown) {
      hfError = e instanceof Error ? e.message : String(e);
      console.error("[aiRouter] Pollinations also failed:", hfError);
    }
  }

  if (options.allowPaidFallback && options.paidFallback) {
    try {
      return await options.paidFallback();
    } catch (e: unknown) {
      const paidError = e instanceof Error ? e.message : String(e);
      throw new Error(`All AI providers failed. Gemini: ${geminiError} | HF: ${hfError} | Paid fallback: ${paidError}`);
    }
  }

  throw new Error(`All AI providers failed. Gemini: ${geminiError} | HF: ${hfError}`);
};

export const loadImagePartFromUrl = async (imageUrl: string): Promise<ImagePart> => {
  return await fetchImageAsBase64(imageUrl);
};

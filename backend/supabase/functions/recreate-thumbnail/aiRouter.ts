import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const GEMINI_MODELS = [
  "gemini-2.5-flash-image",
];
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
  const parts: Array<Record<string, unknown>> = [];
  if (req.images && req.images.length > 0) {
    req.images.forEach((img) => {
      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.data,
        },
      });
    });
  }
  parts.push({ text: `${req.prompt}\nOutput aspect ratio: ${req.aspectRatio}.` });

  let lastErr = "Unknown Gemini error";
  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const body = {
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      lastErr = `Gemini model ${model} failed (${resp.status}): ${await resp.text()}`;
      continue;
    }

    const data = await resp.json();
    const partsOut = data?.candidates?.[0]?.content?.parts || [];
    const inline =
      partsOut.find((p: any) => p?.inlineData)?.inlineData ||
      partsOut.find((p: any) => p?.inline_data)?.inline_data;
    if (!inline?.data) {
      lastErr = `Gemini model ${model} returned no image`;
      continue;
    }

    const imageUrl = `data:${inline.mimeType || inline.mime_type || "image/png"};base64,${inline.data}`;
    return { imageUrl, provider: "gemini", modelUsed: model };
  }

  throw new Error(lastErr);
};

const callPollinationsImage = async (req: PollinationsRequest): Promise<ProviderResult> => {
  const encodedPrompt = encodeURIComponent(req.prompt);
  const params = new URLSearchParams({
    model: req.model,
    width: String(req.width),
    height: String(req.height),
    nologo: "true",
  });
  if (req.imageUrl) {
    params.set("image", req.imageUrl);
  }

  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}`;
  const modelUsed = req.model === "kontext" ? "Pollinations Kontext" : "Pollinations Flux";
  return { imageUrl, provider: "pollinations", modelUsed };
};

export const runImageProviders = async (
  supabaseAdmin: SupabaseClient,
  options: ProviderOptions,
): Promise<ProviderResult> => {
  const geminiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY") || "";

  if (options.gemini && geminiKey) {
    const cooling = await isProviderCoolingDown(supabaseAdmin, "gemini");
    if (!cooling) {
      try {
        return await callGeminiImage(options.gemini, geminiKey);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.error("[aiRouter] Gemini failed:", message);
        const statusMatch = message.match(/\((\d{3})\)/);
        const status = statusMatch ? Number(statusMatch[1]) : 0;
        if (isRateLimitError(status, message)) {
          await markProviderRateLimited(supabaseAdmin, "gemini");
        }
      }
    }
  }

  if (options.pollinations) {
    const cooling = await isProviderCoolingDown(supabaseAdmin, "pollinations");
    if (!cooling) {
      try {
        return await callPollinationsImage(options.pollinations);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        const statusMatch = message.match(/\((\d{3})\)/);
        const status = statusMatch ? Number(statusMatch[1]) : 0;
        if (isRateLimitError(status, message)) {
          await markProviderRateLimited(supabaseAdmin, "pollinations");
        }
      }
    }
  }

  if (options.allowPaidFallback && options.paidFallback) {
    return await options.paidFallback();
  }

  throw new Error("All providers failed");
};

export const loadImagePartFromUrl = async (imageUrl: string): Promise<ImagePart> => {
  return await fetchImageAsBase64(imageUrl);
};

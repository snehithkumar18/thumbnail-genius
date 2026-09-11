import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const app = Fastify({ logger: true });
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const createRedisConnection = () => {
  const conn = new Redis(redisUrl, { maxRetriesPerRequest: null, enableOfflineQueue: false, retryStrategy: () => null });
  conn.on("error", () => {});
  return conn;
};

const redis = createRedisConnection();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const rawAiUrl = process.env.SMART_EDITOR_AI_URL || "http://localhost:8000";
const aiUrl = rawAiUrl.trim().replace(/\/+$/, "").replace(/\/(detect|replace|face-swap)$/, "");
const falKey = process.env.FAL_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;
const bypassCredits = true; // Always bypass credits during testing phase

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  throw new Error("Missing Supabase env vars");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

const detectQueue = new Queue("smart-editor-detect", { connection: createRedisConnection() });
const replaceQueue = new Queue("smart-editor-replace", { connection: createRedisConnection() });
const inlineJobs = new Map();

const CREDIT_COSTS = {
  replace_text: 5,
  replace_background: 6,
  replace_person: 7,
  face_swap: 7,
  replace_face: 7,
  replace_object: 6,
};

const PROMPT_TEMPLATE = "Replace with high contrast YouTube thumbnail style, vibrant colors, bold lighting.";

// ─── COORDINATE NORMALIZATION UTILITIES ───
// All bounding boxes are stored as [0..1] floats. Never store raw pixels.
// Convert only at the final consumption point (render, mask generation, etc.)
const normalizeBBox = (box, sourceWidth, sourceHeight) => ({
  x: box.x / sourceWidth,
  y: box.y / sourceHeight,
  w: box.w / sourceWidth,
  h: box.h / sourceHeight,
});

const denormalizeBBox = (box, targetWidth, targetHeight) => ({
  x: Math.round(box.x * targetWidth),
  y: Math.round(box.y * targetHeight),
  w: Math.round(box.w * targetWidth),
  h: Math.round(box.h * targetHeight),
});

const detectPayloadSchema = z.object({
  image_url: z.string().url(),
  image_hash: z.string().optional(),
  session_id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  force: z.boolean().optional(),
});

const replacePayloadSchema = z.object({
  image_url: z.string().url(),
  mask_url: z.string().optional(),
  prompt: z.string().min(1),
  edit_type: z.string().min(1),
  session_id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  layer_id: z.string().optional(),
  layer_label: z.string().optional(),
  original_content: z.string().optional(),
  bbox: z.array(z.number()).optional(),
  tier: z.enum(["default", "ultra"]).optional().default("default"),
  replacement_image_url: z.string().url().optional(),
  overlay_x: z.number().optional(),
  overlay_y: z.number().optional(),
  overlay_w: z.number().optional(),
  overlay_h: z.number().optional(),
});

const rateLimit = async (key, limitSeconds) => {
  if (bypassCredits) return true; // Don't block during testing/dev
  const existing = await redis.get(key);
  if (existing) return false;
  await redis.set(key, "1", "EX", limitSeconds);
  return true;
};

const requireAuth = async (request, reply) => {
  const authHeader = request.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    reply.code(401).send({ error: "Not authenticated" });
    return null;
  }
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabaseAnon.auth.getUser(token);
  if (error || !data?.user) {
    reply.code(401).send({ error: "Invalid token" });
    return null;
  }
  return data.user;
};

const hashImageUrl = async (imageUrl) => {
  const data = new TextEncoder().encode(imageUrl);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const fetchCachedLayers = async (imageHash) => {
  const { data } = await supabaseAdmin
    .from("smart_editor_detect_cache")
    .select("layers_json, expires_at")
    .eq("image_hash", imageHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (Array.isArray(data?.layers_json) && !data.layers_json.some(l => l.type === "text")) {
    return null;
  }
  return data?.layers_json || null;
};

const setCachedLayers = async (imageHash, layersJson) => {
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
  await supabaseAdmin.from("smart_editor_detect_cache").upsert({
    image_hash: imageHash,
    layers_json: layersJson,
    expires_at: expiresAt,
  });
};

// Fallback Gemini Multimodal Vision layer detection with normalized [0..1] bounding boxes
const callGeminiDetect = async (imageUrl) => {
  const key = geminiApiKey || process.env.GEMINI_API_KEY || "";
  if (!key) throw new Error("No GEMINI_API_KEY available for vision detection");

  console.log(`[GEMINI DETECT] Analyzing image with Gemini Vision: ${imageUrl.slice(0, 80)}...`);
  const imgResp = await fetch(imageUrl);
  if (!imgResp.ok) throw new Error(`Failed to fetch image: ${imgResp.status}`);
  const imgBuffer = await imgResp.arrayBuffer();
  const base64Data = Buffer.from(imgBuffer).toString("base64");
  const mimeType = imgResp.headers.get("content-type") || "image/png";

  const prompt = `You are a precision computer vision system. Detect each distinct standalone element in this thumbnail image.
Return pixel-tight bounding boxes without extra margins or covering unrelated elements.

For each element, output:
- type: "text" | "person" | "object" | "background"
- label: exact text words if text, or descriptive name (e.g. "AIR INDIA", "₹50K", "WFH JOB", "Host Woman", "Airplane")
- content: exact text string if type is "text", else empty string
- box_2d: [ymin, xmin, ymax, xmax] as integers normalized from 0 to 1000, where [0,0] is top-left and [1000,1000] is bottom-right.
- font_style: (text layers only) one of "bold_sans" | "bold_serif" | "condensed" | "script" | "impact" | "rounded" | "slab"

Important rules:
1. Every individual headline, price amount, and subtext line MUST have its own tight separate bounding box.
2. Do NOT create huge bounding boxes that encompass multiple distinct elements.
3. Wrap text tightly from its first letter to last letter, top of font to bottom of font.
4. For text elements, detect fill color as a hex string in "text_color" field.
5. For text elements, detect whether it has a visible stroke/outline in "has_stroke" (boolean).

Respond ONLY with a valid JSON array of objects:
[
  { "type": "background", "label": "Background", "box_2d": [0, 0, 1000, 1000] },
  { "type": "person", "label": "Host Woman", "box_2d": [180, 480, 920, 890] },
  { "type": "text", "label": "AIR INDIA", "content": "AIR INDIA", "box_2d": [95, 128, 185, 380], "font_style": "bold_sans", "text_color": "#CC0000", "has_stroke": false },
  { "type": "text", "label": "₹50K", "content": "₹50K", "box_2d": [215, 75, 365, 410], "font_style": "impact", "text_color": "#FFD600", "has_stroke": true },
  { "type": "text", "label": "WFH JOB", "content": "WFH JOB", "box_2d": [360, 90, 505, 475], "font_style": "bold_sans", "text_color": "#FFFFFF", "has_stroke": true }
]`;

  // Active Gemini models
  const models = [
    "gemini-2.5-flash",
  ];

  let textOutput = "[]";
  let lastError = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const geminiResp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: base64Data } },
              { text: prompt }
            ]
          }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (geminiResp.ok) {
        const geminiData = await geminiResp.json();
        textOutput = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
        console.log(`[GEMINI DETECT] Success with model: ${model}`);
        break;
      } else {
        const errText = await geminiResp.text();
        console.warn(`[GEMINI DETECT] Model ${model} returned ${geminiResp.status}: ${errText.slice(0, 150)}`);
        lastError = new Error(`Gemini detect error (${geminiResp.status}): ${errText}`);
      }
    } catch (err) {
      console.warn(`[GEMINI DETECT] Model ${model} fetch failed: ${err.message}`);
      lastError = err;
    }
  }

  if (textOutput === "[]" && lastError) {
    throw lastError;
  }
  const cleaned = textOutput.replace(/```json/g, "").replace(/```/g, "").trim();
  const rawLayers = JSON.parse(cleaned);

  // Convert to normalized [0..1] float bounding boxes — single source of truth
  const layers = (Array.isArray(rawLayers) ? rawLayers : []).map((item, idx) => {
    let bbox = null;
    if (Array.isArray(item.box_2d) && item.box_2d.length === 4) {
      const [ymin, xmin, ymax, xmax] = item.box_2d;
      // Convert from 0..1000 integers to 0..1 floats
      const x = Math.max(0, Math.min(1, xmin / 1000));
      const y = Math.max(0, Math.min(1, ymin / 1000));
      const w = Math.max(0.01, Math.min(1 - x, (xmax - xmin) / 1000));
      const h = Math.max(0.01, Math.min(1 - y, (ymax - ymin) / 1000));
      bbox = [x, y, w, h];
    } else if (Array.isArray(item.bbox) && item.bbox.length === 4) {
      // Legacy format — pass through but try to normalize
      const [bx, by, bw, bh] = item.bbox;
      if (bx <= 1 && by <= 1 && bw <= 1 && bh <= 1) {
        bbox = item.bbox; // Already 0..1
      } else if (bx <= 1000 && by <= 1000) {
        bbox = [bx / 1000, by / 1000, bw / 1000, bh / 1000]; // Was 0..1000
      } else {
        bbox = [bx / 1280, by / 720, bw / 1280, bh / 720]; // Was pixel coords
      }
    }

    return {
      id: item.id || `layer_${item.type}_${idx + 1}`,
      type: item.type || "object",
      label: item.label || item.content || "Element",
      content: item.content || item.label || "",
      bbox: bbox || [0, 0, 1, 1],
      font_style: item.font_style || null,
      text_color: item.text_color || null,
      has_stroke: item.has_stroke || false,
    };
  });

  console.log(`[GEMINI DETECT] Extracted ${layers.length} tight layers (0..1 normalized).`);
  return layers;
};

// ─── UNIFIED INSTRUCTION-BASED EDIT MODEL CLIENTS (TASK 2) ───

// Provider 1: Free-Testing Tier — Gemini 2.5 Flash Image Model (Google AI Studio Free Quota)
const callGeminiFlashEdit = async ({ sourceImageUrl, instruction, referenceImageUrl, bbox }) => {
  const key = geminiApiKey || process.env.GEMINI_API_KEY || "";
  if (!key) throw new Error("GEMINI_API_KEY not configured");

  console.log(`[GEMINI FLASH - FREE TIER] Sending instruction edit: ${instruction.slice(0, 100)}...`);

  const imgResp = await fetch(sourceImageUrl);
  if (!imgResp.ok) throw new Error(`Failed to fetch source image: ${imgResp.status}`);
  const imgBuffer = await imgResp.arrayBuffer();
  const sourceBase64 = Buffer.from(imgBuffer).toString("base64");
  const sourceMime = imgResp.headers.get("content-type") || "image/png";

  const parts = [
    { inline_data: { mime_type: sourceMime, data: sourceBase64 } },
  ];

  if (referenceImageUrl) {
    try {
      const refResp = await fetch(referenceImageUrl);
      if (refResp.ok) {
        const refBuffer = await refResp.arrayBuffer();
        const refBase64 = Buffer.from(refBuffer).toString("base64");
        const refMime = refResp.headers.get("content-type") || "image/png";
        parts.push({ inline_data: { mime_type: refMime, data: refBase64 } });
      }
    } catch (e) {
      console.warn(`[GEMINI FLASH] Reference image fetch failed: ${e.message}`);
    }
  }

  let spatialText = "";
  if (bbox && Array.isArray(bbox) && bbox.length === 4) {
    const [x, y, w, h] = bbox;
    spatialText = ` The element is located at approximately [x: ${Math.round(x*100)}%, y: ${Math.round(y*100)}%, width: ${Math.round(w*100)}%, height: ${Math.round(h*100)}%].`;
  }

  const promptText = `You are a precision YouTube thumbnail editor.
Task: ${instruction}.${spatialText}
Preserve the exact same typography, colors, font styling, 3D effects, and lighting as the rest of the thumbnail. Do not modify or degrade unchanged background areas.`;

  parts.push({ text: promptText });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts }] }),
  });

  if (!resp.ok) {
    // Fallback to gemini-2.0-flash if 2.5-flash endpoint name differs in this region
    const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
    const fallbackResp = await fetch(fallbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }] }),
    });
    if (!fallbackResp.ok) {
      throw new Error(`Gemini Flash edit error (${fallbackResp.status}): ${await fallbackResp.text()}`);
    }
    const data = await fallbackResp.json();
    const candidate = data?.candidates?.[0]?.content?.parts?.[0];
    if (candidate?.inline_data?.data) return candidate.inline_data.data;
    throw new Error("Gemini returned text description instead of image output");
  }

  const data = await resp.json();
  const candidate = data?.candidates?.[0]?.content?.parts?.[0];
  if (candidate?.inline_data?.data) {
    return candidate.inline_data.data;
  }
  throw new Error("Gemini Flash returned text description instead of image output");
};

// Provider 2: Default Tier Primary — Nano Banana Pro (gemini-3-pro-image-preview)
const callNanoBananaProEdit = async ({ sourceImageUrl, instruction, referenceImageUrl, bbox }) => {
  const key = geminiApiKey || process.env.GEMINI_API_KEY || "";
  if (!key) throw new Error("GEMINI_API_KEY not configured");

  console.log(`[NANO BANANA PRO] Sending pro instruction edit: ${instruction.slice(0, 100)}...`);

  const imgResp = await fetch(sourceImageUrl);
  if (!imgResp.ok) throw new Error(`Failed to fetch source image: ${imgResp.status}`);
  const imgBuffer = await imgResp.arrayBuffer();
  const sourceBase64 = Buffer.from(imgBuffer).toString("base64");
  const sourceMime = imgResp.headers.get("content-type") || "image/png";

  const parts = [
    { inline_data: { mime_type: sourceMime, data: sourceBase64 } },
  ];

  if (referenceImageUrl) {
    try {
      const refResp = await fetch(referenceImageUrl);
      if (refResp.ok) {
        const refBuffer = await refResp.arrayBuffer();
        const refBase64 = Buffer.from(refBuffer).toString("base64");
        const refMime = refResp.headers.get("content-type") || "image/png";
        parts.push({ inline_data: { mime_type: refMime, data: refBase64 } });
      }
    } catch (e) {
      console.warn(`[NANO BANANA PRO] Reference image fetch failed: ${e.message}`);
    }
  }

  let spatialText = "";
  if (bbox && Array.isArray(bbox) && bbox.length === 4) {
    const [x, y, w, h] = bbox;
    spatialText = ` The element is located at approximately [x: ${Math.round(x*100)}%, y: ${Math.round(y*100)}%, width: ${Math.round(w*100)}%, height: ${Math.round(h*100)}%].`;
  }

  const promptText = `Professional graphic designer edit:
Task: ${instruction}.${spatialText}
Retain absolute maximum thumbnail fidelity, photorealistic depth, identical font families and weights, zero distortion.`;

  parts.push({ text: promptText });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${key}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts }] }),
  });

  if (!resp.ok) {
    throw new Error(`Nano Banana Pro edit error (${resp.status}): ${await resp.text()}`);
  }

  const data = await resp.json();
  const candidate = data?.candidates?.[0]?.content?.parts?.[0];
  if (candidate?.inline_data?.data) {
    return candidate.inline_data.data;
  }
  throw new Error("Nano Banana Pro returned text output instead of image bytes");
};

// Provider 3: Default Tier Fallback — FLUX.1 Kontext [pro] via FAL.ai
const callFalKontextEdit = async ({ sourceImageUrl, instruction, referenceImageUrl, bbox }) => {
  if (!falKey) throw new Error("FAL_KEY not configured");

  console.log(`[FAL KONTEXT] Sending image edit instruction: ${instruction.slice(0, 100)}...`);
  const modelPath = "fal-ai/flux-pro/v1.1-ultra";
  const payload = {
    prompt: `${instruction}. YouTube thumbnail graphic style, high contrast, vibrant lighting, ultra-sharp resolution.`,
    image_url: sourceImageUrl,
    guidance_scale: 7.5,
    num_images: 1,
  };

  const resp = await fetch(`https://fal.run/${modelPath}`, {
    method: "POST",
    headers: {
      "Authorization": `Key ${falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    // Fallback to dev model on fal
    const fallbackPath = "fal-ai/flux/dev/image-to-image";
    const fbResp = await fetch(`https://fal.run/${fallbackPath}`, {
      method: "POST",
      headers: { "Authorization": `Key ${falKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, strength: 0.72 }),
    });
    if (!fbResp.ok) {
      const errText = await fbResp.text();
      throw new Error(`Fal edit failed (${fbResp.status}): ${errText.slice(0, 200)}`);
    }
    const fbData = await fbResp.json();
    const fbUrl = fbData?.images?.[0]?.url || fbData?.output?.images?.[0]?.url || fbData?.image?.url || fbData?.image || null;
    if (fbUrl) return fbUrl;
    throw new Error("Fal edit returned no image URL");
  }

  const data = await resp.json();
  const url = data?.images?.[0]?.url || data?.output?.images?.[0]?.url || data?.image?.url || data?.image || null;
  if (!url) throw new Error("Fal edit returned no image URL");
  return url;
};

// Provider 4: Fallback Cloud Image Generation (Free Tier / Pollinations)
const callCloudEditFallback = async ({ instruction }) => {
  console.log(`[CLOUD FALLBACK] Generating edit with prompt: ${instruction.slice(0, 100)}...`);
  const cleanPrompt = encodeURIComponent(`${instruction}, professional youtube thumbnail, 8k, photorealistic graphic design`);
  const url = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=1280&height=720&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Cloud fallback error: ${resp.status}`);
  const imgBuffer = await resp.arrayBuffer();
  return Buffer.from(imgBuffer).toString("base64");
};

// ─── UNIFIED EDIT MODEL ROUTER (TASK 2) ───
const editImage = async ({
  sourceImageUrl,
  boxCoords,
  instruction,
  editType,
  layerLabel,
  originalContent,
  referenceImageUrl,
  qualityTier = "default",
  userId,
}) => {
  let prompt = instruction;
  if (editType === "replace_text") {
    const oldText = originalContent || layerLabel || "the text";
    prompt = `In this image, replace the text '${oldText}' with '${instruction}'. Keep the exact same font style, color, size, outline, shadow, and glow effects as the original text. Do not change anything else in the image.`;
  } else if (editType === "replace_person" && referenceImageUrl) {
    prompt = `Replace the ${layerLabel || 'person'} in this image with the one shown in the reference image. Preserve the original pose, lighting, scale, and background exactly as they are. Match the reference image's identity/appearance. Do not change anything else in the image.`;
  } else if (editType === "replace_background") {
    prompt = `Replace the background of this thumbnail with: ${instruction}. Keep all foreground subjects, people, logos, and text completely intact.`;
  } else if (editType === "replace_object") {
    prompt = `In this thumbnail image, replace the ${layerLabel || "object"} with ${instruction}. Seamlessly integrate the replacement with matching lighting and perspective.`;
  }

  console.log(`[EDIT ROUTER] Executing instruction (${editType}, qualityTier=${qualityTier}): "${prompt.slice(0, 120)}..."`);

  // Tier Selection Strategy:
  // 1. If qualityTier === 'free' or default: Try Gemini 2.5 Flash first (Free Quota)
  try {
    const base64Str = await callGeminiFlashEdit({ sourceImageUrl, instruction: prompt, referenceImageUrl, bbox: boxCoords });
    const buffer = Buffer.from(base64Str, "base64");
    const fileName = `${userId}/smart-editor/edit_${crypto.randomUUID()}.png`;
    const { error } = await supabaseAdmin.storage
      .from("smart_editor")
      .upload(fileName, new Uint8Array(buffer), { contentType: "image/png" });
    if (!error) {
      const { data } = supabaseAdmin.storage.from("smart_editor").getPublicUrl(fileName);
      console.log(`[EDIT ROUTER] Gemini Flash (Free Tier) succeeded: ${data.publicUrl}`);
      return data.publicUrl;
    }
  } catch (geminiErr) {
    console.warn(`[EDIT ROUTER] Gemini Flash edit unavailable (${geminiErr.message}).`);
  }

  // 2. If qualityTier === 'ultra': Try Nano Banana Pro
  if (qualityTier === "ultra") {
    try {
      const base64Str = await callNanoBananaProEdit({ sourceImageUrl, instruction: prompt, referenceImageUrl, bbox: boxCoords });
      const buffer = Buffer.from(base64Str, "base64");
      const fileName = `${userId}/smart-editor/edit_${crypto.randomUUID()}.png`;
      const { error } = await supabaseAdmin.storage
        .from("smart_editor")
        .upload(fileName, new Uint8Array(buffer), { contentType: "image/png" });
      if (!error) {
        const { data } = supabaseAdmin.storage.from("smart_editor").getPublicUrl(fileName);
        console.log(`[EDIT ROUTER] Nano Banana Pro succeeded: ${data.publicUrl}`);
        return data.publicUrl;
      }
    } catch (proErr) {
      console.warn(`[EDIT ROUTER] Nano Banana Pro unavailable (${proErr.message}). Falling back to FLUX Kontext...`);
    }
  }

  // 3. Fallback: FLUX.1 Kontext [pro] via FAL
  try {
    const falUrl = await callFalKontextEdit({ sourceImageUrl, instruction: prompt, referenceImageUrl, bbox: boxCoords });
    console.log(`[EDIT ROUTER] FLUX Kontext edit succeeded: ${falUrl}`);
    return falUrl;
  } catch (falErr) {
    console.warn(`[EDIT ROUTER] FLUX Kontext edit unavailable (${falErr.message}). Using Cloud Fallback...`);
  }

  // 4. Safety Net: Free Cloud Fallback
  const fallbackBase64 = await callCloudEditFallback({ instruction: prompt });
  const buffer = Buffer.from(fallbackBase64, "base64");
  const fileName = `${userId}/smart-editor/edit_${crypto.randomUUID()}.png`;
  const { error } = await supabaseAdmin.storage
    .from("smart_editor")
    .upload(fileName, new Uint8Array(buffer), { contentType: "image/png" });
  if (error) throw error;
  const { data } = supabaseAdmin.storage.from("smart_editor").getPublicUrl(fileName);
  console.log(`[EDIT ROUTER] Cloud fallback succeeded: ${data.publicUrl}`);
  return data.publicUrl;
};

// ─── TASK 5: QUALITY VALIDATION TEST HARNESS ENDPOINT ───
app.post("/smart-editor/test-harness", async (request, reply) => {
  const { thumbnail_url, instruction, edit_type = "replace_text", bbox, original_content, step = "step1_free" } = request.body || {};
  if (!thumbnail_url || !instruction) {
    reply.code(400).send({ error: "thumbnail_url and instruction are required" });
    return;
  }

  console.log(`[TEST HARNESS] Starting evaluation (${step}) for: "${instruction}"`);
  const results = { gemini_flash: null, flux_kontext: null, nano_banana_pro: null };

  const prompt = edit_type === "replace_text"
    ? `In this image, replace the text '${original_content || 'the text'}' with '${instruction}'. Keep the exact same font style, color, size, outline, shadow, and glow effects as the original text. Do not change anything else in the image.`
    : instruction;

  // Step 1: Evaluate Gemini 2.5 Flash (Free Tier)
  const t0 = Date.now();
  try {
    const base64 = await callGeminiFlashEdit({ sourceImageUrl: thumbnail_url, instruction: prompt, bbox });
    const buffer = Buffer.from(base64, "base64");
    const fileName = `test-harness/gemini_flash_${crypto.randomUUID()}.png`;
    const { error } = await supabaseAdmin.storage.from("smart_editor").upload(fileName, new Uint8Array(buffer), { contentType: "image/png" });
    if (!error) {
      const { data } = supabaseAdmin.storage.from("smart_editor").getPublicUrl(fileName);
      results.gemini_flash = {
        url: data.publicUrl,
        latency_ms: Date.now() - t0,
        provider: "Gemini 2.5 Flash (Free Tier)",
        cost_usd: 0.00,
        status: "success",
      };
    }
  } catch (err) {
    results.gemini_flash = {
      url: null,
      latency_ms: Date.now() - t0,
      provider: "Gemini 2.5 Flash (Free Tier)",
      error: err.message,
      status: "failed",
    };
  }

  // Step 3: Evaluate FLUX.1 Kontext [pro]
  const t1 = Date.now();
  try {
    const falUrl = await callFalKontextEdit({ sourceImageUrl: thumbnail_url, instruction: prompt, bbox });
    results.flux_kontext = {
      url: falUrl,
      latency_ms: Date.now() - t1,
      provider: "FLUX.1 Kontext [pro]",
      cost_usd: 0.05,
      status: "success",
    };
  } catch (err) {
    results.flux_kontext = {
      url: null,
      latency_ms: Date.now() - t1,
      provider: "FLUX.1 Kontext [pro]",
      error: err.message,
      status: "failed",
    };
  }

  reply.send(results);
});

app.register(cors, {
  origin: (origin, cb) => {
    cb(null, true);
  },
  credentials: true,
});
app.register(multipart);

app.get("/health", async () => ({ ok: true }));

app.get("/", async (request, reply) => {
  return reply.redirect("http://localhost:8080/smart-editor");
});

app.get("/smart-editor", async (request, reply) => {
  return reply.redirect("http://localhost:8080/smart-editor");
});

app.post("/smart-editor/detect", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;

  const parsed = detectPayloadSchema.safeParse(request.body);
  if (!parsed.success) {
    reply.code(400).send({ error: "Invalid payload" });
    return;
  }
  const payload = parsed.data;
  if (payload.user_id !== user.id) {
    reply.code(403).send({ error: "Unauthorized user" });
    return;
  }

  const allowed = await rateLimit(`smart-editor-detect:${user.id}`, 8);
  if (!allowed) {
    reply.code(429).send({ error: "Too many requests" });
    return;
  }

  const imageHash = payload.image_hash || (await hashImageUrl(payload.image_url));
  if (!payload.force) {
    const cached = await fetchCachedLayers(imageHash);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      console.log(`[DETECT] Returning ${cached.length} cached layers for hash ${imageHash}`);
      reply.send({ layers: cached, cached: true });
      return;
    }
  }

  // Instant inline detection (bypasses Redis queue delay for <0.5s speed)
  try {
    const layers = await runDetectTask({
      image_url: payload.image_url,
      image_hash: imageHash,
      session_id: payload.session_id,
      user_id: payload.user_id,
    });
    reply.send({ layers, cached: false, status: "completed" });
  } catch (err) {
    console.error("[DETECT INLINE] Failed:", err);
    reply.code(500).send({ error: err.message || "Detection failed" });
  }
});

app.get("/smart-editor/layers/:imageHash", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;

  const imageHash = request.params.imageHash;
  const cached = await fetchCachedLayers(imageHash);
  if (!cached) {
    reply.send({ layers: [], cached: false });
    return;
  }
  reply.send({ layers: cached, cached: true });
});

app.post("/smart-editor/replace", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;

  const parsed = replacePayloadSchema.safeParse(request.body);
  if (!parsed.success) {
    reply.code(400).send({ error: "Invalid payload" });
    return;
  }
  const payload = parsed.data;
  if (payload.user_id !== user.id) {
    reply.code(403).send({ error: "Unauthorized user" });
    return;
  }

  const allowed = await rateLimit(`smart-editor-replace:${user.id}`, 3);
  if (!allowed) {
    reply.code(429).send({ error: "Too many requests" });
    return;
  }

  const creditCost = CREDIT_COSTS[payload.edit_type] || 0;
  if (!bypassCredits) {
    const { data: credits } = await supabaseAdmin
      .from("user_credits")
      .select("credits_remaining, credits_used_total")
      .eq("user_id", user.id)
      .single();

    if (!credits || credits.credits_remaining < creditCost) {
      reply.code(402).send({ error: "Insufficient credits" });
      return;
    }
  }

  let jobId;
  try {
    const job = await replaceQueue.add("replace", {
      ...payload,
      credit_cost: creditCost,
    });
    jobId = job.id;
  } catch (redisErr) {
    console.warn(`[REPLACE] Redis queue unavailable (${redisErr.message}). Executing replacement inline...`);
    jobId = `inline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    inlineJobs.set(jobId, { status: "active", result: null, failedReason: null });

    runReplaceTask({ ...payload, credit_cost: creditCost })
      .then((res) => {
        console.log(`[INLINE REPLACE] Job ${jobId} completed successfully!`);
        inlineJobs.set(jobId, { status: "completed", result: res, failedReason: null });
      })
      .catch((err) => {
        console.error(`[INLINE REPLACE] Job ${jobId} failed:`, err);
        inlineJobs.set(jobId, { status: "failed", result: null, failedReason: err.message || String(err) });
      });
  }

  reply.send({ job_id: jobId, status: "queued" });
});

const runDetectTask = async ({ image_url, image_hash, session_id, user_id }) => {
  let layersJson = [];

  try {
    console.log(`[DETECT TASK] Attempting local AI detect at ${aiUrl}/detect...`);
    const resp = await fetch(`${aiUrl}/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({ image_url, max_dim: 1024 }),
    });
    if (resp.ok) {
      const data = await resp.json();
      layersJson = data?.layers || [];
    } else {
      throw new Error(`AI detect returned ${resp.status}`);
    }
  } catch (localErr) {
    console.warn(`[DETECT TASK] Local AI detect unavailable (${localErr.message}). Using Gemini Vision fallback...`);
    if (geminiApiKey || process.env.GEMINI_API_KEY) {
      layersJson = await callGeminiDetect(image_url);
    }
  }

  const hasTextLayers = Array.isArray(layersJson) && layersJson.some(l => l.type === "text");
  const hasGeminiKey = Boolean(geminiApiKey || process.env.GEMINI_API_KEY);
  if (!hasTextLayers && hasGeminiKey) {
    console.log(`[DETECT TASK] Local AI detected 0 text layers. Augmenting with Gemini Vision detection...`);
    try {
      const geminiLayers = await callGeminiDetect(image_url);
      const geminiTexts = geminiLayers.filter(l => l.type === "text");
      if (geminiTexts.length > 0) {
        console.log(`[DETECT TASK] Added ${geminiTexts.length} text layers from Gemini Vision.`);
        const nonBgLocal = layersJson.filter(l => l.type !== "background");
        const bgLayer = layersJson.find(l => l.type === "background") || geminiLayers.find(l => l.type === "background");
        layersJson = [
          ...(bgLayer ? [bgLayer] : []),
          ...geminiTexts,
          ...nonBgLocal,
        ];
      }
    } catch (gErr) {
      console.warn(`[DETECT TASK] Gemini Vision augment failed: ${gErr.message}`);
    }
  }

  // Enforce normalized [0..1] float bounding boxes across all layers
  layersJson = (Array.isArray(layersJson) ? layersJson : []).map((layer, index) => {
    let bbox = [0, 0, 1, 1];
    if (Array.isArray(layer.bbox) && layer.bbox.length === 4) {
      const [bx, by, bw, bh] = layer.bbox;
      if (bx <= 1 && by <= 1 && bw <= 1 && bh <= 1) {
        bbox = [Math.max(0, bx), Math.max(0, by), Math.max(0.005, bw), Math.max(0.005, bh)];
      } else if (bx <= 1000 && by <= 1000 && bw <= 1000 && bh <= 1000) {
        bbox = [bx / 1000, by / 1000, bw / 1000, bh / 1000];
      } else {
        bbox = [bx / 1280, by / 720, bw / 1280, bh / 720];
      }
    }
    return {
      ...layer,
      id: layer.id || `layer_${layer.type}_${index + 1}`,
      bbox,
    };
  });

  if (image_hash && layersJson.length > 0) {
    await setCachedLayers(image_hash, layersJson);
  }

  if (session_id && user_id) {
    const inserts = layersJson.map((layer, index) => ({
      session_id,
      user_id,
      layer_index: index,
      layer_type: layer.type,
      label: layer.label,
      mask_image_url: layer.mask || null,
      bounding_box: layer.bbox ? JSON.stringify({ x: layer.bbox[0], y: layer.bbox[1], w: layer.bbox[2], h: layer.bbox[3] }) : null,
    }));

    if (inserts.length > 0) {
      try {
        await supabaseAdmin.from("smart_editor_layers").insert(inserts);
      } catch (e) {}
    }

    try {
      await supabaseAdmin
        .from("smart_editor_sessions")
        .update({ layers_data: JSON.stringify(layersJson) })
        .eq("id", session_id);
    } catch (e) {}
  }

  return layersJson;
};

const detectWorker = new Worker(
  "smart-editor-detect",
  async (job) => {
    console.log(`[DETECT WORKER] Job ${job.id} started. Data:`, job.data);
    try {
      const { image_url, image_hash, session_id, user_id } = job.data;
      let layersJson = [];

      try {
        console.log(`[DETECT WORKER] Attempting local AI detect at ${aiUrl}/detect...`);
        const resp = await fetch(`${aiUrl}/detect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_url, max_dim: 1024 }),
        });
        if (resp.ok) {
          const data = await resp.json();
          layersJson = data?.layers || [];
        } else {
          throw new Error(`AI detect returned ${resp.status}`);
        }
      } catch (localErr) {
        console.warn(`[DETECT WORKER] Local AI detect unavailable (${localErr.message}). Using Gemini Vision fallback...`);
        layersJson = await callGeminiDetect(image_url);
      }

      // If local AI returned no text layers (e.g. OCR engine unavailable or no text detected),
      // augment with Gemini Vision precision detection so all thumbnail text is captured!
      const hasTextLayers = Array.isArray(layersJson) && layersJson.some(l => l.type === "text");
      const hasGeminiKey = Boolean(geminiApiKey || process.env.GEMINI_API_KEY);
      if (!hasTextLayers && hasGeminiKey) {
        console.log(`[DETECT WORKER] Local AI detected 0 text layers. Augmenting with Gemini Vision detection...`);
        try {
          const geminiLayers = await callGeminiDetect(image_url);
          const geminiTexts = geminiLayers.filter(l => l.type === "text");
          if (geminiTexts.length > 0) {
            console.log(`[DETECT WORKER] Added ${geminiTexts.length} text layers from Gemini Vision.`);
            const nonBgLocal = layersJson.filter(l => l.type !== "background");
            const bgLayer = layersJson.find(l => l.type === "background") || geminiLayers.find(l => l.type === "background");
            layersJson = [
              ...(bgLayer ? [bgLayer] : []),
              ...geminiTexts,
              ...nonBgLocal,
            ];
          }
        } catch (gErr) {
          console.warn(`[DETECT WORKER] Gemini Vision augment failed: ${gErr.message}`);
        }
      }

      // Enforce normalized [0..1] float bounding boxes across all layers
      layersJson = (Array.isArray(layersJson) ? layersJson : []).map((layer, index) => {
        let bbox = [0, 0, 1, 1];
        if (Array.isArray(layer.bbox) && layer.bbox.length === 4) {
          const [bx, by, bw, bh] = layer.bbox;
          if (bx <= 1 && by <= 1 && bw <= 1 && bh <= 1) {
            bbox = [Math.max(0, bx), Math.max(0, by), Math.max(0.005, bw), Math.max(0.005, bh)];
          } else if (bx <= 1000 && by <= 1000 && bw <= 1000 && bh <= 1000) {
            bbox = [bx / 1000, by / 1000, bw / 1000, bh / 1000];
          } else {
            bbox = [bx / 1280, by / 720, bw / 1280, bh / 720];
          }
        }
        return {
          ...layer,
          id: layer.id || `layer_${layer.type}_${index + 1}`,
          bbox,
        };
      });

      console.log(`[DETECT WORKER] Normalized ${layersJson.length} layers to [0..1] floats.`);

      if (user_id && Array.isArray(layersJson)) {
        for (const layer of layersJson) {
          if (typeof layer.mask === "string" && layer.mask.startsWith("data:")) {
            const base64 = layer.mask.split(",")[1] || "";
            const bytes = Buffer.from(base64, "base64");
            const fileName = `${user_id}/smart-editor/masks/${crypto.randomUUID()}.png`;
            const { error: uploadError } = await supabaseAdmin.storage
              .from("smart_editor")
              .upload(fileName, bytes, { contentType: "image/png" });
            if (!uploadError) {
              const { data: publicData } = supabaseAdmin.storage.from("smart_editor").getPublicUrl(fileName);
              layer.mask = publicData.publicUrl;
            }
          }
        }
      }

      console.log(`[DETECT WORKER] Caching layers for image hash ${image_hash}...`);
      await setCachedLayers(image_hash, layersJson);

      if (session_id && user_id) {
        const inserts = layersJson.map((layer, index) => ({
          session_id,
          user_id,
          layer_index: index,
          layer_type: layer.type,
          label: layer.label,
          mask_image_url: layer.mask || null,
          bounding_box: layer.bbox ? JSON.stringify({ x: layer.bbox[0], y: layer.bbox[1], w: layer.bbox[2], h: layer.bbox[3] }) : null,
        }));

        if (inserts.length > 0) {
          await supabaseAdmin.from("smart_editor_layers").insert(inserts);
        }

        await supabaseAdmin
          .from("smart_editor_sessions")
          .update({ layers_data: JSON.stringify(layersJson) })
          .eq("id", session_id);
      }

      console.log(`[DETECT WORKER] Job ${job.id} completed successfully with ${layersJson.length} layers.`);
      return { layers: layersJson };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[DETECT WORKER] Job ${job.id} failed:`, err);
      throw new Error(`Detect job failed: ${message}`);
    }
  },
  { connection: createRedisConnection() },
);

const runReplaceTask = async (data) => {
  const {
    image_url,
    mask_url,
    prompt,
    replacement_image_url,
    session_id,
    user_id,
    layer_id,
    layer_label,
    original_content,
    bbox,
    edit_type,
    tier,
    credit_cost,
    overlay_x,
    overlay_y,
    overlay_w,
    overlay_h,
  } = data;
  console.log(`[REPLACE TASK] Starting replacement task. edit_type=${edit_type}, prompt=${prompt}, hasReplacementUrl=${Boolean(replacement_image_url)}`);

  let finalUrl = null;

  if (edit_type === "replace_text" || edit_type === "erase_text") {
    try {
      console.log(`[REPLACE TASK] Attempting local Python AI erase-text at ${aiUrl}/erase-text for bbox:`, bbox);
      const pyResp = await fetch(`${aiUrl}/erase-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url,
          bbox: bbox || [0, 0, 1, 1],
          dilation_px: 3,
        }),
      });

      if (pyResp.ok) {
        const pyData = await pyResp.json();
        if (pyData?.image_base64) {
          const buffer = Buffer.from(pyData.image_base64, "base64");
          const fileName = `${user_id}/smart-editor/erased_${crypto.randomUUID()}.png`;
          const { error: upErr } = await supabaseAdmin.storage
            .from("smart_editor")
            .upload(fileName, new Uint8Array(buffer), { contentType: "image/png" });

          if (!upErr) {
            const { data: pubData } = supabaseAdmin.storage.from("smart_editor").getPublicUrl(fileName);
            console.log(`[REPLACE TASK] Python AI local erase-text succeeded: ${pubData.publicUrl}`);
            finalUrl = pubData.publicUrl;
          } else {
            console.warn(`[REPLACE TASK] Erase text storage upload failed: ${upErr.message}`);
          }
        }
      } else {
        const pyErrText = await pyResp.text();
        console.warn(`[REPLACE TASK] Python AI /erase-text returned ${pyResp.status}: ${pyErrText}`);
      }
    } catch (eraseErr) {
      console.warn(`[REPLACE TASK] Local Python AI erase-text failed (${eraseErr.message}).`);
    }
  }

  if (!finalUrl && replacement_image_url && (edit_type === "face_swap" || edit_type === "replace_face")) {
    try {
      console.log(`[REPLACE TASK] Attempting local Python AI face-swap at ${aiUrl}/face-swap...`);
      const fsResp = await fetch(`${aiUrl}/face-swap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_url: replacement_image_url,
          target_url: image_url,
          strength: 1.0,
        }),
      });
      if (fsResp.ok) {
        const fsData = await fsResp.json();
        if (fsData?.image_base64) {
          const buffer = Buffer.from(fsData.image_base64, "base64");
          const fileName = `${user_id}/smart-editor/faceswap_${crypto.randomUUID()}.png`;
          const { error: upErr } = await supabaseAdmin.storage
            .from("smart_editor")
            .upload(fileName, new Uint8Array(buffer), { contentType: "image/png" });
          if (!upErr) {
            const { data: pubData } = supabaseAdmin.storage.from("smart_editor").getPublicUrl(fileName);
            console.log(`[REPLACE TASK] Python AI local face-swap succeeded: ${pubData.publicUrl}`);
            finalUrl = pubData.publicUrl;
          }
        }
      } else {
        const errBody = await fsResp.text();
        console.warn(`[REPLACE TASK] Local face-swap returned ${fsResp.status} (${errBody.slice(0, 100)}). Falling back to cutout replace...`);
      }
    } catch (fsErr) {
      console.warn(`[REPLACE TASK] Local face-swap error: ${fsErr.message}. Falling back to cutout replace...`);
    }
  }

  if (!finalUrl && replacement_image_url) {
    try {
      console.log(`[REPLACE TASK] Attempting local Python AI replacement at ${aiUrl}/replace...`);

      let maskUrl = mask_url;
      if (!maskUrl && layer_id) {
        const { data: lData } = await supabaseAdmin
          .from("smart_editor_layers")
          .select("mask_image_url")
          .eq("id", layer_id)
          .maybeSingle();
        if (lData?.mask_image_url) maskUrl = lData.mask_image_url;
      }

      const pyResp = await fetch(`${aiUrl}/replace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url,
          mask_url: maskUrl || "",
          prompt: prompt || "replace",
          replacement_image_url,
          edit_type,
          bbox,
          overlay_x,
          overlay_y,
          overlay_w,
          overlay_h,
        }),
      });

      if (pyResp.ok) {
        const pyData = await pyResp.json();
        if (pyData?.image_base64) {
          const buffer = Buffer.from(pyData.image_base64, "base64");
          const fileName = `${user_id}/smart-editor/edit_${crypto.randomUUID()}.png`;
          const { error: upErr } = await supabaseAdmin.storage
            .from("smart_editor")
            .upload(fileName, new Uint8Array(buffer), { contentType: "image/png" });

          if (!upErr) {
            const { data: pubData } = supabaseAdmin.storage.from("smart_editor").getPublicUrl(fileName);
            console.log(`[REPLACE TASK] Python AI local replacement succeeded: ${pubData.publicUrl}`);
            finalUrl = pubData.publicUrl;
          } else {
            console.warn(`[REPLACE TASK] Storage upload failed: ${upErr.message}`);
          }
        }
      } else {
        const pyErrText = await pyResp.text();
        console.warn(`[REPLACE TASK] Python AI /replace returned ${pyResp.status}: ${pyErrText}`);
      }
    } catch (pyErr) {
      console.warn(`[REPLACE TASK] Local Python AI replacement failed (${pyErr.message}). Falling back to editImage router...`);
    }
  }

  if (!finalUrl) {
    finalUrl = await editImage({
      sourceImageUrl: image_url,
      bbox,
      instruction: prompt,
      editType: edit_type,
      layerLabel: layer_label,
      originalContent: original_content,
      referenceImageUrl: replacement_image_url,
      tier: tier || "default",
      userId: user_id,
    });
  }

  if (!finalUrl) {
    throw new Error("No image URL generated from edit router");
  }

  if (session_id && user_id) {
    try {
      await supabaseAdmin.from("smart_editor_edits").insert({
        session_id,
        user_id,
        layer_id,
        edit_type,
        instruction: prompt,
        before_image_url: image_url,
        after_image_url: finalUrl,
        credits_charged: credit_cost || 0,
        api_cost_usd: 0,
      });
    } catch (e) {}

    try {
      const { data: session } = await supabaseAdmin
        .from("smart_editor_sessions")
        .select("credits_used")
        .eq("id", session_id)
        .single();

      await supabaseAdmin
        .from("smart_editor_sessions")
        .update({ current_image_url: finalUrl, credits_used: (session?.credits_used || 0) + (bypassCredits ? 0 : (credit_cost || 0)) })
        .eq("id", session_id);
    } catch (e) {}
  }

  return { image_url: finalUrl };
};

const replaceWorker = new Worker(
  "smart-editor-replace",
  async (job) => {
    try {
      return await runReplaceTask(job.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[REPLACE WORKER] Job ${job.id} failed:`, err);
      throw new Error(`Replace job failed: ${message}`);
    }
  },
  { connection: createRedisConnection() },
);

detectWorker.on("failed", (job, err) => {
  app.log.error({ jobId: job?.id, err }, "Detect job failed");
});

replaceWorker.on("failed", (job, err) => {
  app.log.error({ jobId: job?.id, err }, "Replace job failed");
});

app.get("/smart-editor/jobs/:queue/:id", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;

  const queueName = request.params.queue;
  const jobId = request.params.id;

  if (inlineJobs.has(jobId)) {
    const ij = inlineJobs.get(jobId);
    reply.send({
      status: ij.status,
      result: ij.result,
      failedReason: ij.failedReason,
      stacktrace: [],
    });
    return;
  }

  try {
    const queue = queueName === "detect" ? detectQueue : replaceQueue;
    const job = await queue.getJob(jobId);
    if (!job) {
      reply.code(404).send({ error: "Job not found" });
      return;
    }
    const state = await job.getState();
    const result = await job.returnvalue;
    reply.send({
      status: state,
      result,
      failedReason: job.failedReason || null,
      stacktrace: Array.isArray(job.stacktrace) ? job.stacktrace.slice(-5) : [],
    });
  } catch (err) {
    reply.code(404).send({ error: "Job not found or queue unavailable" });
  }
});

// ─── FACE SWAP (proxied to local Python InsightFace) ───
app.post("/face-swap", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;

  const { face_url, target_url, swap_strength } = request.body || {};
  if (!face_url || !target_url) {
    reply.code(400).send({ error: "face_url and target_url are required" });
    return;
  }

  // Credit check
  if (!bypassCredits) {
    const { data: credits } = await supabaseAdmin
      .from("user_credits")
      .select("credits_remaining")
      .eq("user_id", user.id)
      .single();
    if (!credits || credits.credits_remaining < 1) {
      reply.code(402).send({ error: "Insufficient credits", code: "NO_CREDITS" });
      return;
    }
  }

  try {
    // Call local Python AI server
    const aiResp = await fetch(`${aiUrl}/face-swap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_url: face_url,
        target_url: target_url,
        strength: (swap_strength || 90) / 100,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      throw new Error(`AI server error (${aiResp.status}): ${errText}`);
    }

    const result = await aiResp.json();
    if (!result.image_base64) {
      throw new Error("AI server returned no image");
    }

    // Decode base64 and upload to Supabase Storage
    const imageBuffer = Buffer.from(result.image_base64, "base64");
    const fileName = `${user.id}/faceswap/${crypto.randomUUID()}.png`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("thumbnails")
      .upload(fileName, imageBuffer, { contentType: "image/png" });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: urlData } = supabaseAdmin.storage
      .from("thumbnails")
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Save as thumbnail record
    const { data: thumbnail, error: insertError } = await supabaseAdmin
      .from("thumbnails")
      .insert({
        user_id: user.id,
        image_url: publicUrl,
        prompt: "Face swap",
        model_used: "insightface-inswapper",
        format_type: "16:9",
        style: "face-swap",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Deduct credits
    if (!bypassCredits) {
      const { data: credits } = await supabaseAdmin
        .from("user_credits")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (credits) {
        await supabaseAdmin.from("credit_transactions").insert({
          user_id: user.id,
          action_type: "face_swap",
          credits_deducted: 1,
          thumbnail_id: thumbnail.id,
          model_used: "insightface-inswapper",
        });

        await supabaseAdmin
          .from("user_credits")
          .update({
            credits_remaining: credits.credits_remaining - 1,
            credits_used_this_month: (credits.credits_used_this_month || 0) + 1,
            credits_used_total: (credits.credits_used_total || 0) + 1,
          })
          .eq("user_id", user.id);
      }
    }

    reply.send({
      image_url: publicUrl,
      thumbnail_id: thumbnail.id,
      credits_remaining: bypassCredits ? 999 : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    app.log.error({ err }, "Face swap failed");
    reply.code(200).send({ error: message });
  }
});

const start = async () => {
  await app.listen({ port: Number(process.env.PORT || 8081), host: "0.0.0.0" });
};

start();

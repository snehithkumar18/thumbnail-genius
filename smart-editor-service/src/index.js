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
const createRedisConnection = () => new Redis(redisUrl, { maxRetriesPerRequest: null });

const redis = createRedisConnection();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const aiUrl = process.env.SMART_EDITOR_AI_URL || "http://localhost:8000";
const falKey = process.env.FAL_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;
const bypassCredits = process.env.BYPASS_CREDITS === "true";

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  throw new Error("Missing Supabase env vars");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

const detectQueue = new Queue("smart-editor-detect", { connection: createRedisConnection() });
const replaceQueue = new Queue("smart-editor-replace", { connection: createRedisConnection() });

const CREDIT_COSTS = {
  replace_text: 5,
  replace_background: 6,
  replace_person: 7,
  replace_object: 6,
};

const PROMPT_TEMPLATE = "Replace with high contrast YouTube thumbnail style, vibrant colors, bold lighting.";

const detectPayloadSchema = z.object({
  image_url: z.string().url(),
  image_hash: z.string().optional(),
  session_id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  force: z.boolean().optional(),
});

const replacePayloadSchema = z.object({
  image_url: z.string().url(),
  mask_url: z.string().url(),
  prompt: z.string().min(1),
  edit_type: z.string().min(1),
  session_id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  layer_id: z.string().optional(),
  replacement_image_url: z.string().url().optional(),
  overlay_x: z.number().optional(),
  overlay_y: z.number().optional(),
  overlay_w: z.number().optional(),
  overlay_h: z.number().optional(),
});

const rateLimit = async (key, limitSeconds) => {
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

const callFalReplace = async ({ image_url, mask_url, prompt }) => {
  if (!falKey) throw new Error("FAL_KEY not configured");
  const finalPrompt = `${prompt}\n${PROMPT_TEMPLATE}`;

  // Use flux inpainting model which properly supports mask-based editing
  const modelPath = "fal-ai/flux/dev/inpainting";
  const payload = {
    prompt: finalPrompt,
    image_url,
    mask_url,
    strength: 0.85,
    num_images: 1,
    image_size: "landscape_16_9",
  };

  console.log(`[FAL] Calling ${modelPath} with prompt: ${finalPrompt.slice(0, 100)}...`);
  console.log(`[FAL] image_url: ${image_url.slice(0, 80)}...`);
  console.log(`[FAL] mask_url: ${mask_url.slice(0, 80)}...`);

  const resp = await fetch(`https://fal.run/${modelPath}`, {
    method: "POST",
    headers: {
      "Authorization": `Key ${falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error(`[FAL] Failed (${resp.status}): ${errText}`);
    throw new Error(`Fal replace failed (${resp.status}): ${errText}`);
  }
  const data = await resp.json();
  console.log("[FAL] Response keys:", Object.keys(data));

  // Extract URL from various possible response shapes
  const url =
    data?.images?.[0]?.url ||
    data?.output?.images?.[0]?.url ||
    data?.output?.image?.url ||
    data?.image?.url ||
    data?.image ||
    null;
  if (!url) {
    console.error("[FAL] No image URL in response:", JSON.stringify(data).slice(0, 500));
    throw new Error("Fal replace returned no image");
  }
  console.log(`[FAL] Success: ${url.slice(0, 80)}...`);
  return url;
};

// --------------- FREE Local Python/Pollinations-based image editing ---------------
const callLocalReplace = async ({ image_url, mask_url, prompt, replacement_image_url, edit_type, overlay_x, overlay_y, overlay_w, overlay_h }) => {
  console.log(`[LOCAL REPLACE] Starting local image replacement with prompt: ${prompt.slice(0, 100)}...`);
  const resp = await fetch(`${aiUrl}/replace`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url, mask_url, prompt, replacement_image_url, edit_type, overlay_x, overlay_y, overlay_w, overlay_h }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error(`[LOCAL REPLACE] Failed (${resp.status}): ${errText.slice(0, 300)}`);
    throw new Error(`Local replace failed (${resp.status}): ${errText.slice(0, 200)}`);
  }

  const data = await resp.json();
  if (!data?.image_base64) {
    throw new Error("Local replace returned no image data");
  }
  return data.image_base64;
};

app.register(cors, {
  origin: process.env.SMART_EDITOR_CORS_ORIGIN?.split(",") || true,
  credentials: true,
});
app.register(multipart);

app.get("/health", async () => ({ ok: true }));

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
    if (cached) {
      reply.send({ layers: cached, cached: true });
      return;
    }
  }

  const job = await detectQueue.add("detect", {
    image_url: payload.image_url,
    image_hash: imageHash,
    session_id: payload.session_id,
    user_id: payload.user_id,
  });

  reply.send({ job_id: job.id, status: "queued" });
});

app.get("/smart-editor/layers/:imageHash", async (request, reply) => {
  const user = await requireAuth(request, reply);
  if (!user) return;

  const imageHash = request.params.imageHash;
  const cached = await fetchCachedLayers(imageHash);
  if (!cached) {
    reply.code(404).send({ error: "Not found" });
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

  const allowed = await rateLimit(`smart-editor-replace:${user.id}`, 6);
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

  const job = await replaceQueue.add("replace", {
    ...payload,
    credit_cost: creditCost,
  });
  reply.send({ job_id: job.id, status: "queued" });
});

const detectWorker = new Worker(
  "smart-editor-detect",
  async (job) => {
    console.log(`[DETECT WORKER] Job ${job.id} started. Data:`, job.data);
    try {
      const { image_url, image_hash, session_id, user_id } = job.data;
      console.log(`[DETECT WORKER] Calling AI detect at ${aiUrl}/detect...`);
      const resp = await fetch(`${aiUrl}/detect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url, max_dim: 1024 }),
      });

      if (!resp.ok) {
        throw new Error(`AI detect failed (${resp.status}): ${await resp.text()}`);
      }
      const data = await resp.json();
      const layersJson = data?.layers || [];
      console.log(`[DETECT WORKER] AI detect returned ${layersJson.length} layers.`);

      if (user_id && Array.isArray(layersJson)) {
        for (const layer of layersJson) {
          if (typeof layer.mask === "string" && layer.mask.startsWith("data:")) {
            const base64 = layer.mask.split(",")[1] || "";
            const bytes = Buffer.from(base64, "base64");
            const fileName = `${user_id}/smart-editor/masks/${crypto.randomUUID()}.png`;
            console.log(`[DETECT WORKER] Uploading mask for layer ${layer.label} to Supabase...`);
            const { error: uploadError } = await supabaseAdmin.storage
              .from("smart_editor")
              .upload(fileName, bytes, { contentType: "image/png" });
            if (!uploadError) {
              const { data: publicData } = supabaseAdmin.storage.from("smart_editor").getPublicUrl(fileName);
              layer.mask = publicData.publicUrl;
              console.log(`[DETECT WORKER] Mask uploaded: ${layer.mask}`);
            } else {
              console.error(`[DETECT WORKER] Supabase mask upload error:`, uploadError);
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
          console.log(`[DETECT WORKER] Inserting ${inserts.length} layers into smart_editor_layers...`);
          const { error: insertError } = await supabaseAdmin.from("smart_editor_layers").insert(inserts);
          if (insertError) {
            console.error(`[DETECT WORKER] Insert layers error:`, insertError);
          }
        }

        console.log(`[DETECT WORKER] Updating session layers_data for session ${session_id}...`);
        const { error: updateError } = await supabaseAdmin
          .from("smart_editor_sessions")
          .update({ layers_data: JSON.stringify(layersJson) })
          .eq("id", session_id);
        if (updateError) {
          console.error(`[DETECT WORKER] Session update error:`, updateError);
        }
      }
      console.log(`[DETECT WORKER] Job ${job.id} completed successfully.`);
      return { layers: layersJson };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[DETECT WORKER] Job ${job.id} failed:`, err);
      throw new Error(`Detect job failed: ${message}`);
    }
  },
  { connection: createRedisConnection() },
);

const replaceWorker = new Worker(
  "smart-editor-replace",
  async (job) => {
    try {
      const { image_url, mask_url, prompt, replacement_image_url, session_id, user_id, layer_id, edit_type, credit_cost, overlay_x, overlay_y, overlay_w, overlay_h } = job.data;
      // Try Local (free) first, then FAL as fallback
      let imageBytes;
      let isLocalSuccess = false;
      let imageUrl;
      try {
        const base64Str = await callLocalReplace({ image_url, mask_url, prompt, replacement_image_url, edit_type, overlay_x, overlay_y, overlay_w, overlay_h });
        const resultBuffer = Buffer.from(base64Str, "base64");
        imageBytes = new Uint8Array(resultBuffer);
        isLocalSuccess = true;
      } catch (localErr) {
        console.warn(`[REPLACE] Local replace failed, trying FAL: ${localErr.message}`);
        imageUrl = await callFalReplace({ image_url, mask_url, prompt });
        const imageResp = await fetch(imageUrl);
        imageBytes = new Uint8Array(await imageResp.arrayBuffer());
      }

      // Upload to Supabase storage
      const fileName = `${user_id}/smart-editor/replace_${crypto.randomUUID()}.png`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("smart_editor")
        .upload(fileName, imageBytes, { contentType: "image/png" });

      let finalUrl = isLocalSuccess ? "" : imageUrl;
      if (!uploadError) {
        const { data } = supabaseAdmin.storage.from("smart_editor").getPublicUrl(fileName);
        finalUrl = data.publicUrl;
      } else {
        console.error("[REPLACE] Upload to Supabase failed:", uploadError);
        if (isLocalSuccess) {
          throw new Error(`Failed to upload local replace result: ${uploadError.message}`);
        }
      }

      if (session_id && user_id) {
        await supabaseAdmin.from("smart_editor_edits").insert({
          session_id,
          user_id,
          layer_id,
          edit_type,
          instruction: prompt,
          before_image_url: image_url,
          after_image_url: finalUrl,
          credits_charged: credit_cost,
          api_cost_usd: 0,
        });

        const { data: session } = await supabaseAdmin
          .from("smart_editor_sessions")
          .select("credits_used")
          .eq("id", session_id)
          .single();

        await supabaseAdmin
          .from("smart_editor_sessions")
          .update({ current_image_url: finalUrl, credits_used: (session?.credits_used || 0) + (bypassCredits ? 0 : credit_cost) })
          .eq("id", session_id);

        if (!bypassCredits) {
          const { data: credits } = await supabaseAdmin
            .from("user_credits")
            .select("credits_remaining, credits_used_total")
            .eq("user_id", user_id)
            .single();

          if (credits) {
            await supabaseAdmin
              .from("user_credits")
              .update({
                credits_remaining: credits.credits_remaining - credit_cost,
                credits_used_total: (credits.credits_used_total || 0) + credit_cost,
              })
              .eq("user_id", user_id);
          }
        }
      }

      return { image_url: finalUrl };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
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

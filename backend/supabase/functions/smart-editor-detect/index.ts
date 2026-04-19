import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type DetectedLayer = {
  type: "text" | "person" | "object" | "background";
  label: string;
  mask_url?: string | null;
  bbox?: { x: number; y: number; w: number; h: number } | null;
};

const extractJson = (text: string): any => {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[1] || match[0]);
    } catch {
      return null;
    }
  }
};

const fetchImageAsBase64 = async (imageUrl: string): Promise<{ data: string; mimeType: string }> => {
  const resp = await fetch(imageUrl);
  if (!resp.ok) throw new Error("Failed to fetch image for Gemini detect");
  const mimeType = resp.headers.get("content-type") || "image/jpeg";
  const bytes = new Uint8Array(await resp.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
  }
  return { data: btoa(binary), mimeType };
};

const safeJson = async (resp: Response): Promise<any | null> => {
  try {
    return await resp.json();
  } catch {
    return null;
  }
};

const detectWithGemini = async (imageUrl: string): Promise<DetectedLayer[]> => {
  const apiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");
  if (!apiKey) return [];

  const image = await fetchImageAsBase64(imageUrl);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              inline_data: {
                mime_type: image.mimeType,
                data: image.data,
              },
            },
            {
              text: "Detect major editable thumbnail elements and return only JSON in this shape: {\"layers\":[{\"type\":\"person|object|background|text\",\"label\":\"...\",\"bbox\":{\"x\":0.0,\"y\":0.0,\"w\":0.0,\"h\":0.0}}]}. bbox values must be normalized from 0 to 1. Include at least one background layer and up to 12 major layers. Avoid tiny or duplicate items.",
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) return [];
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("\n") || "";
  const parsed = extractJson(text);
  const layers = Array.isArray(parsed?.layers) ? parsed.layers : [];
  return layers
    .filter((l: any) => l?.type && l?.label && l?.bbox)
    .map((l: any) => ({
      type: ["text", "person", "background"].includes(String(l.type)) ? l.type : "object",
      label: String(l.label),
      bbox: {
        x: Number(l.bbox.x),
        y: Number(l.bbox.y),
        w: Number(l.bbox.w),
        h: Number(l.bbox.h),
      },
    }));
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

    if (!falApiKey) throw new Error("FAL_KEY not configured");

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { image_url, session_id, user_id } = await req.json();
    
    if (user.id !== user_id) {
        return new Response(JSON.stringify({ error: "Unauthorized user" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Try Fal.ai first; fall back to Gemini if Fal returns no useful layers.
    const [evfRes, birefnetRes] = await Promise.all([
      fetch("https://fal.run/fal-ai/evf-sam", {
        method: "POST",
        headers: {
          "Authorization": `Key ${falApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          image_url: image_url,
          text_prompt: "person, text, background, money, car, food, phone, laptop, animal, building, product"
        })
      }),
      fetch("https://fal.run/fal-ai/birefnet", {
        method: "POST",
        headers: {
          "Authorization": `Key ${falApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          image_url: image_url,
          model: "General Use (Light)",
          output_format: "png"
        })
      })
    ]);

    const evfData = await safeJson(evfRes);
    const birefnetData = await safeJson(birefnetRes);

    const extractFalError = (data: any) => {
      const msg =
        data?.error?.message ||
        data?.error ||
        data?.message ||
        data?.detail ||
        null;
      return typeof msg === "string" ? msg : null;
    };

    const evfErr = !evfRes.ok ? extractFalError(evfData) : null;
    const birefErr = !birefnetRes.ok ? extractFalError(birefnetData) : null;
    const combinedErr = evfErr || birefErr;
    if (combinedErr) {
      const lower = combinedErr.toLowerCase();
      const isCredits = lower.includes("insufficient") || lower.includes("credits") || lower.includes("balance") || lower.includes("quota");
      return new Response(
        JSON.stringify({ error: isCredits ? "FAL insufficient credits" : `FAL error: ${combinedErr}` }),
        { status: isCredits ? 402 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const layers: DetectedLayer[] = [];

    // Background mask from BiRefNet (we'll just label the overall result as 'background' layer optionally, or add object maps)
    // Actually, BiRefNet just returns the object with no bg. Let's create a 'background' type layer assuming there's a mask.
    if (birefnetData?.image?.url) {
        layers.push({
            type: 'background',
            label: 'Background',
            mask_url: birefnetData.image.url
        });
    }

    // Maps from EVF-SAM2
    const masks = Array.isArray(evfData?.masks)
      ? evfData.masks
      : Array.isArray(evfData?.output?.masks)
      ? evfData.output.masks
      : [];
    if (masks.length > 0) {
      for (const [index, m] of masks.entries()) {
        const rawLabel = String(m?.label || m?.text || m?.caption || "");
        const txtLabel = rawLabel.toLowerCase();
        let type: DetectedLayer["type"] = "object";
        if (txtLabel.includes("person") || txtLabel.includes("face")) type = "person";
        else if (txtLabel.includes("text")) type = "text";

        let bbox = null;
        if (Array.isArray(m.box) && m.box.length === 4) {
          const [x1, y1, x2, y2] = m.box.map((n: any) => Number(n));
          bbox = { x: x1, y: y1, w: Math.max(0, x2 - x1), h: Math.max(0, y2 - y1) };
        } else if (m.box && typeof m.box === "object") {
          const x = Number((m.box.x ?? m.box.left ?? 0));
          const y = Number((m.box.y ?? m.box.top ?? 0));
          const w = Number((m.box.w ?? m.box.width ?? 0));
          const h = Number((m.box.h ?? m.box.height ?? 0));
          bbox = { x, y, w, h };
        }

        if (type !== "text") {
          layers.push({
            type,
            label: rawLabel || `Object ${index + 1}`,
            mask_url: m.mask_url || null,
            bbox,
          });
        }
      }
    }

    if (layers.length === 0) {
      const geminiLayers = await detectWithGemini(image_url);
      layers.push(...geminiLayers.filter((l) => l.type !== "text"));
    }

    // Insert layers into the table
    const inserts = layers.map((layer, index) => ({
        session_id,
        user_id,
        layer_index: index,
        layer_type: layer.type,
        label: layer.label,
        mask_image_url: layer.mask_url,
        bounding_box: layer.bbox ? JSON.stringify(layer.bbox) : null,
    }));

    if (inserts.length > 0) {
        const { error: insertErr } = await supabaseAdmin.from('smart_editor_layers').insert(inserts);
        if (insertErr) {
            console.error("Insert Layer Error:", insertErr);
        }
    }

    // Update sessions
    const layersJson = JSON.stringify(layers);
    await supabaseAdmin.from('smart_editor_sessions')
      .update({ layers_data: layersJson })
      .eq('id', session_id);

    return new Response(
      JSON.stringify(layers),
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

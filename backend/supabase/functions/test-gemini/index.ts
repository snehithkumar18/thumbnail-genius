import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY") || "";

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "No GEMINI_API_KEY found" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: Record<string, any> = {};

  // Step 1: List all available models
  try {
    const listResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    const listData = await listResp.json();
    if (listData.models) {
      results.availableModels = listData.models
        .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m: any) => ({
          name: m.name,
          displayName: m.displayName,
          methods: m.supportedGenerationMethods,
        }));
    } else {
      results.listError = listData;
    }
  } catch (e) {
    results.listError = String(e);
  }

  // Step 2: Try image generation with different model names
  const modelsToTest = [
    "gemini-2.5-flash-preview-05-20",
    "gemini-2.5-flash",
    "gemini-2.5-flash-image",
    "gemini-2.5-flash-lite-image",
    "gemini-2.0-flash",
    "gemini-2.0-flash-image",
    "gemini-2.0-flash-exp",
    "gemini-2.0-flash-exp-image-generation",
    "imagen-3.0-generate-002",
  ];

  results.imageTests = {};

  for (const model of modelsToTest) {
    try {
      const body = {
        contents: [{ role: "user", parts: [{ text: "Generate a small red circle on white background" }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      };
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await resp.json();
      
      if (resp.ok) {
        const parts = data?.candidates?.[0]?.content?.parts || [];
        const hasImage = parts.some((p: any) => p?.inlineData || p?.inline_data);
        results.imageTests[model] = {
          status: resp.status,
          success: true,
          hasImage,
          finishReason: data?.candidates?.[0]?.finishReason,
        };
      } else {
        results.imageTests[model] = {
          status: resp.status,
          success: false,
          error: data?.error?.message?.substring(0, 150) || "Unknown",
        };
      }
    } catch (e) {
      results.imageTests[model] = { status: 0, success: false, error: String(e).substring(0, 150) };
    }
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

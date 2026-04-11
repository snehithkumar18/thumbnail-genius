// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      await sleep(900);
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
      throw new Error(statusData?.error || "fal.ai upscaling failed");
    }

    await sleep(900);
  }

  throw new Error("fal.ai upscaling timed out");
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const bypassPlanChecks = Deno.env.get("BYPASS_PLAN_CHECKS") === "true";
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = (Deno.env.get("SB_SERVICE_ROLE_JWT") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!;

    const supabaseAnonKey = (Deno.env.get("SB_ANON_JWT") ?? Deno.env.get("SUPABASE_ANON_KEY")) ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    if (!supabaseAnonKey) {
      throw new Error("SUPABASE_ANON_KEY not configured");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const falApiKey = Deno.env.get("FAL_KEY");
    if (!falApiKey) {
      throw new Error("FAL_KEY not configured");
    }

    const { image_url } = await req.json();
    if (!image_url) {
      return new Response(JSON.stringify({ error: "image_url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let { data: credits, error: creditsError } = await supabaseAdmin
      .from("user_credits")
      .select("plan_type")
      .eq("user_id", user.id)
      .single();

    if (!credits) {
      const noRow = (creditsError as any)?.code === "PGRST116";
      if (creditsError && !noRow) {
        throw new Error("Unable to verify plan");
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
        throw new Error("Unable to verify plan");
      }

      const { data: hydratedCredits, error: hydratedCreditsError } = await supabaseAdmin
        .from("user_credits")
        .select("plan_type")
        .eq("user_id", user.id)
        .single();

      if (hydratedCreditsError || !hydratedCredits) {
        throw new Error("Unable to verify plan");
      }

      credits = hydratedCredits;
    }

    if (!bypassPlanChecks && credits.plan_type !== "studio") {
      return new Response(JSON.stringify({ error: "4K upscaling is available on Studio plan" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const falData = await runFalJob(
      "fal-ai/esrgan",
      {
        image_url,
        scale: 4,
        face_enhance: true,
      },
      falApiKey,
    );

    const upscaledImageUrl = extractFalImageUrl(falData);
    if (!upscaledImageUrl) {
      throw new Error("No upscaled image returned by ESRGAN");
    }

    return new Response(JSON.stringify({ image_url: upscaledImageUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("upscale-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

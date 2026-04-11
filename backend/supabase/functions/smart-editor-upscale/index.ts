import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const { session_id, image_url, user_id } = await req.json();

    if (user.id !== user_id) {
        return new Response(JSON.stringify({ error: "Unauthorized user" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const creditCost = 2; // UPSCALE_4K cost

    const { data: creditsData } = await supabaseAdmin
        .from('user_credits')
        .select('*')
        .eq('user_id', user.id)
        .single();
    
    if (!creditsData || creditsData.credits_remaining < creditCost) {
        return new Response(JSON.stringify({ error: "Insufficient credits" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const runResp = await fetch("https://fal.run/fal-ai/esrgan", {
        method: "POST",
        headers: {
            "Authorization": `Key ${falApiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ image_url, scale: 4, face_enhance: true })
    });

    if (!runResp.ok) throw new Error("Fal API failed");

    const falData = await runResp.json();
    const resultImageUrl = falData?.image?.url;

    if (!resultImageUrl) throw new Error("No image returned from Fal API");

    // Upload to Storage
    const imageFetch = await fetch(resultImageUrl);
    const imageBytes = new Uint8Array(await imageFetch.arrayBuffer());
    
    const timestamp = Date.now();
    const fileName = `${user.id}/4k_${timestamp}.png`;

    const { error: uploadError } = await supabaseAdmin.storage
        .from("smart_editor")
        .upload(fileName, imageBytes, { contentType: "image/png" });

    let finalImageUrl = resultImageUrl;
    if (!uploadError) {
        const { data: publicUrlData } = supabaseAdmin.storage.from("smart_editor").getPublicUrl(fileName);
        finalImageUrl = publicUrlData.publicUrl;
    }

    // Deduct credits
    await supabaseAdmin.from('user_credits')
        .update({
            credits_remaining: creditsData.credits_remaining - creditCost,
            credits_used_total: (creditsData.credits_used_total || 0) + creditCost
        })
        .eq('user_id', user.id);

    return new Response(
      JSON.stringify({ url: finalImageUrl }),
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CREDIT_COST = 1;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { current_image_url, edit_instruction, thumbnail_id } = body;

    if (!current_image_url || !edit_instruction) {
      return new Response(JSON.stringify({ error: "Image URL and edit instruction are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check credits
    const { data: credits, error: creditsError } = await supabaseAdmin
      .from("user_credits")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (creditsError || !credits) {
      return new Response(JSON.stringify({ error: "Could not fetch credits" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (credits.credits_remaining < CREDIT_COST) {
      return new Response(
        JSON.stringify({ error: "Insufficient credits", credits_remaining: credits.credits_remaining, required: CREDIT_COST }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enhance instruction
    let enhancedInstruction = edit_instruction;
    try {
      const enhanceResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `Convert this simple edit instruction into a detailed image editing prompt. Preserve overall composition. Focus the change on the specific edit requested. Return ONLY the enhanced prompt, under 100 words.`,
            },
            {
              role: "user",
              content: edit_instruction,
            },
          ],
        }),
      });

      if (enhanceResp.ok) {
        const enhanceData = await enhanceResp.json();
        enhancedInstruction = enhanceData.choices?.[0]?.message?.content?.trim() || edit_instruction;
      }
    } catch (e) {
      console.error("Enhancement failed:", e);
    }

    // Generate edited image
    const startTime = Date.now();
    const genResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: `Edit this image: ${enhancedInstruction}. Keep the overall composition and style intact. Only make the requested changes.` },
              { type: "image_url", image_url: { url: current_image_url } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!genResp.ok) {
      const errText = await genResp.text();
      console.error("Edit generation error:", genResp.status, errText);
      if (genResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (genResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Edit failed: ${genResp.status}`);
    }

    const genData = await genResp.json();
    const base64Url = genData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!base64Url) throw new Error("No image returned from AI");

    const base64Data = base64Url.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const fileName = `${user.id}/${crypto.randomUUID()}.png`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("thumbnails")
      .upload(fileName, imageBytes, { contentType: "image/png", upsert: false });

    if (uploadError) throw new Error("Failed to upload image");

    const { data: publicUrlData } = supabaseAdmin.storage.from("thumbnails").getPublicUrl(fileName);
    const generationTime = Date.now() - startTime;

    // Save as new thumbnail (edited version)
    const { data: thumbRecord, error: insertError } = await supabaseAdmin
      .from("thumbnails")
      .insert({
        user_id: user.id,
        image_url: publicUrlData.publicUrl,
        prompt: edit_instruction,
        enhanced_prompt: enhancedInstruction,
        model_used: "AI Edit",
        style: "edited",
        format_type: "16:9",
        generation_time_ms: generationTime,
      })
      .select("id")
      .single();

    if (insertError) throw new Error("Failed to save edited thumbnail");

    // Deduct credits
    await supabaseAdmin
      .from("user_credits")
      .update({
        credits_remaining: credits.credits_remaining - CREDIT_COST,
        credits_used_total: credits.credits_used_total + CREDIT_COST,
        credits_used_this_month: credits.credits_used_this_month + CREDIT_COST,
      })
      .eq("user_id", user.id);

    await supabaseAdmin.from("credit_transactions").insert({
      user_id: user.id,
      action_type: "ai_edit",
      credits_deducted: CREDIT_COST,
      model_used: "AI Edit",
      thumbnail_id: thumbRecord.id,
    });

    return new Response(
      JSON.stringify({
        image_url: publicUrlData.publicUrl,
        thumbnail_id: thumbRecord.id,
        credits_remaining: credits.credits_remaining - CREDIT_COST,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("edit-thumbnail error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

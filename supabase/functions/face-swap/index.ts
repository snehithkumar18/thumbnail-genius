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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader?.replace("Bearer ", "") || ""
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { face_url, target_url, swap_strength, user_id } = await req.json();

    // Credit check
    const { data: credits } = await supabase
      .from("user_credits")
      .select("credits_remaining")
      .eq("user_id", user.id)
      .single();

    if (!credits || credits.credits_remaining < 3) {
      return new Response(JSON.stringify({ error: "Insufficient credits", code: "NO_CREDITS" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Lovable AI to generate a face-swapped version
    // Since direct face-swap APIs aren't available, we use image editing
    const editPrompt = `Take the face from the first image (source face) and seamlessly place it onto the person in the second image (target thumbnail). Maintain the exact same pose, lighting, and composition of the target image. The face should blend naturally with the target image's lighting and skin tones. Swap strength: ${Math.round((swap_strength || 0.9) * 100)}%. Keep the YouTube thumbnail style, make it look professional and natural.`;

    const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: editPrompt },
              { type: "image_url", image_url: { url: face_url } },
              { type: "image_url", image_url: { url: target_url } },
            ],
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI API error: ${errText}`);
    }

    const aiData = await aiResponse.json();

    // Extract image from response
    let imageBase64: string | null = null;
    for (const choice of aiData.choices || []) {
      const content = choice.message?.content;
      if (Array.isArray(content)) {
        for (const part of content) {
          if (part.type === "image_url" && part.image_url?.url) {
            const url = part.image_url.url;
            if (url.startsWith("data:")) {
              imageBase64 = url.split(",")[1];
            }
          }
        }
      }
    }

    if (!imageBase64) {
      throw new Error("No image generated");
    }

    // Upload to storage
    const imageBytes = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));
    const fileName = `faceswap/${user.id}/${crypto.randomUUID()}.png`;

    const { error: uploadError } = await supabase.storage
      .from("thumbnails")
      .upload(fileName, imageBytes, { contentType: "image/png" });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from("thumbnails").getPublicUrl(fileName);

    // Save thumbnail
    const { data: thumbnail, error: insertError } = await supabase
      .from("thumbnails")
      .insert({
        user_id: user.id,
        image_url: urlData.publicUrl,
        prompt: `Face swap: strength ${Math.round((swap_strength || 0.9) * 100)}%`,
        model_used: "gemini-3-pro-image-preview",
        format_type: "16:9",
        style: "face-swap",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Deduct credits
    await supabase.from("credit_transactions").insert({
      user_id: user.id,
      action_type: "face_swap",
      credits_deducted: 3,
      thumbnail_id: thumbnail.id,
      model_used: "gemini-3-pro-image-preview",
    });

    await supabase
      .from("user_credits")
      .update({
        credits_remaining: credits.credits_remaining - 3,
        credits_used_this_month: (credits as any).credits_used_this_month + 3,
        credits_used_total: (credits as any).credits_used_total + 3,
      })
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({
        image_url: urlData.publicUrl,
        thumbnail_id: thumbnail.id,
        credits_remaining: credits.credits_remaining - 3,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

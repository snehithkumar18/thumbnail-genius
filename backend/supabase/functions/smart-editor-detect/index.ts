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

    const { image_url, session_id, user_id } = await req.json();
    
    if (user.id !== user_id) {
        return new Response(JSON.stringify({ error: "Unauthorized user" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Call Fal.ai sequentially or in parallel
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

    if (!evfRes.ok || !birefnetRes.ok) {
        console.error("Fal API errors", await evfRes.text(), await birefnetRes.text());
        throw new Error("Fal AI APIs failed");
    }

    const evfData = await evfRes.json();
    const birefnetData = await birefnetRes.json();

    const layers = [];

    // Background mask from BiRefNet (we'll just label the overall result as 'background' layer optionally, or add object maps)
    // Actually, BiRefNet just returns the object with no bg. Let's create a 'background' type layer assuming there's a mask.
    if (birefnetData.image && birefnetData.image.url) {
        layers.push({
            type: 'background',
            label: 'Background',
            mask_url: birefnetData.image.url
        });
    }

    // Maps from EVF-SAM2
    if (evfData.masks && Array.isArray(evfData.masks)) {
        evfData.masks.forEach((m: any, index: number) => {
           // Basic logic, infer type from label (EVF-SAM might return specific labels based on the prompt)
           const txtLabel = String(m.label || "Object").toLowerCase();
           let type = 'object';
           if (txtLabel.includes('person') || txtLabel.includes('face')) type = 'person';
           else if (txtLabel.includes('text')) type = 'text';

           if (type !== 'text') { // Text detection done strictly frontend via Tesseract
             layers.push({
               type,
               label: m.label || `Object ${index + 1}`,
               mask_url: m.mask_url || null,
               bbox: m.box || null // Might be normalized or coordinates
             });
           }
        });
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

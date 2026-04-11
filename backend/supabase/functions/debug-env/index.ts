import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const env: Record<string, string> = {};
  const keys = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_ANON_KEY",
    "SB_SERVICE_ROLE_JWT",
    "SB_ANON_JWT",
    "GROQ_API_KEY",
    "FAL_KEY",
    "TOGETHER_API_KEY",
    "GEMINI_API_KEY",
    "BYPASS_CREDITS",
  ];

  for (const key of keys) {
    const val = Deno.env.get(key);
    if (val) {
      env[key] = val.substring(0, 10) + "...(" + val.length + " chars)";
    } else {
      env[key] = "NOT SET";
    }
  }

  return new Response(JSON.stringify({ env, timestamp: new Date().toISOString() }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

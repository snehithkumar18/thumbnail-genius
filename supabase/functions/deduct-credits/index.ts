import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const CREDIT_COSTS: Record<string, number> = {
  fast_generate: 1,
  pro_generate: 2,
  text_thumbnail: 2,
  shorts_cover: 2,
  recreate_url: 3,
  ai_edit: 1,
  face_swap: 3,
  thumbnail_score: 1,
  title_generate: 0,
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub;

    const { action_type, model } = await req.json();

    const cost = CREDIT_COSTS[action_type] ?? 1;
    if (cost === 0) {
      return new Response(JSON.stringify({ success: true, credits_remaining: -1, cost: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role for credit operations
    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: credits, error: fetchError } = await adminSupabase
      .from('user_credits')
      .select('subscription_credits, topup_credits, rollover_credits, credits_used_this_month, credits_used_total')
      .eq('user_id', userId)
      .single();

    if (fetchError || !credits) {
      return new Response(JSON.stringify({ error: 'Credits not found' }), { status: 404, headers: corsHeaders });
    }

    const subCredits = credits.subscription_credits ?? 0;
    const topCredits = credits.topup_credits ?? 0;
    const rollCredits = credits.rollover_credits ?? 0;
    const total = subCredits + rollCredits + topCredits;

    if (total < cost) {
      return new Response(JSON.stringify({
        error: 'insufficient_credits',
        credits_needed: cost,
        credits_have: total,
      }), { status: 402, headers: corsHeaders });
    }

    // Deduction order: subscription → rollover → topup
    let remaining = cost;
    let newSub = subCredits;
    let newRoll = rollCredits;
    let newTop = topCredits;

    if (remaining > 0 && newSub > 0) {
      const deduct = Math.min(remaining, newSub);
      newSub -= deduct;
      remaining -= deduct;
    }
    if (remaining > 0 && newRoll > 0) {
      const deduct = Math.min(remaining, newRoll);
      newRoll -= deduct;
      remaining -= deduct;
    }
    if (remaining > 0 && newTop > 0) {
      const deduct = Math.min(remaining, newTop);
      newTop -= deduct;
      remaining -= deduct;
    }

    const newTotal = newSub + newRoll + newTop;

    await adminSupabase
      .from('user_credits')
      .update({
        subscription_credits: newSub,
        rollover_credits: newRoll,
        topup_credits: newTop,
        credits_remaining: newTotal,
        credits_used_this_month: (credits.credits_used_this_month ?? 0) + cost,
        credits_used_total: (credits.credits_used_total ?? 0) + cost,
      })
      .eq('user_id', userId);

    await adminSupabase.from('credit_transactions').insert({
      user_id: userId,
      action_type,
      credits_deducted: cost,
      model_used: model ?? null,
    });

    return new Response(JSON.stringify({
      success: true,
      credits_remaining: newTotal,
      cost,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Deduct credits error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});

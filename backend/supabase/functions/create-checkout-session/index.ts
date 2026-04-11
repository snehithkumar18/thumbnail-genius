import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PRODUCTS: Record<string, { credits: number; type: 'topup' | 'subscription'; plan: string | null; rollover_max: number }> = {
  topup_starter: { credits: 30, type: 'topup', plan: null, rollover_max: 0 },
  topup_boost: { credits: 80, type: 'topup', plan: null, rollover_max: 0 },
  topup_power: { credits: 200, type: 'topup', plan: null, rollover_max: 0 },
  basic_monthly: { credits: 100, type: 'subscription', plan: 'basic', rollover_max: 50 },
  basic_annual: { credits: 100, type: 'subscription', plan: 'basic', rollover_max: 50 },
  creator_monthly: { credits: 200, type: 'subscription', plan: 'creator', rollover_max: 100 },
  creator_annual: { credits: 200, type: 'subscription', plan: 'creator', rollover_max: 100 },
  pro_monthly: { credits: 350, type: 'subscription', plan: 'pro', rollover_max: 350 },
  pro_annual: { credits: 350, type: 'subscription', plan: 'pro', rollover_max: 350 },
  studio_monthly: { credits: 600, type: 'subscription', plan: 'studio', rollover_max: 999999 },
  studio_annual: { credits: 600, type: 'subscription', plan: 'studio', rollover_max: 999999 },
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
      (Deno.env.get('SB_ANON_JWT') ?? Deno.env.get('SUPABASE_ANON_KEY'))!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub;

    const { product_id, user_email, billing_country } = await req.json();

    const product = PRODUCTS[product_id];
    if (!product) {
      return new Response(JSON.stringify({ error: 'Invalid product' }), { status: 400, headers: corsHeaders });
    }

    const DODO_SECRET_KEY = Deno.env.get('DODO_SECRET_KEY');
    if (!DODO_SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'Payment system not configured' }), { status: 500, headers: corsHeaders });
    }

    const billingPeriod = product_id.includes('_annual') ? 'annual' : product_id.includes('_monthly') ? 'monthly' : 'one_time';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
    const successUrl = `https://${projectRef}.supabase.co/functions/v1/dodo-webhook?redirect=success&plan=${product.plan ?? 'topup'}`;

    const dodoResponse = await fetch('https://api.dodopayments.com/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DODO_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        billing: { city: null, country: billing_country === 'IN' ? 'IN' : 'US', state: null, street: null, zipcode: null },
        customer: { email: user_email, name: user_email?.split('@')[0] ?? 'Customer' },
        payment_link: true,
        product_cart: [{ product_id: product_id, quantity: 1 }],
        metadata: {
          user_id: userId,
          product_id: product_id,
          credits_to_add: product.credits.toString(),
          plan_type: product.plan ?? 'none',
          product_type: product.type,
          billing_period: billingPeriod,
          rollover_max: product.rollover_max.toString(),
        },
        return_url: `${req.headers.get('origin') ?? 'https://thumbai.app'}/dashboard?payment=success&plan=${product.plan ?? 'topup'}`,
      }),
    });

    if (!dodoResponse.ok) {
      const errText = await dodoResponse.text();
      console.error('Dodo API error:', errText);
      return new Response(JSON.stringify({ error: 'Failed to create checkout', details: errText }), { status: 500, headers: corsHeaders });
    }

    const dodoData = await dodoResponse.json();

    return new Response(JSON.stringify({ 
      checkout_url: dodoData.payment_link ?? dodoData.url ?? dodoData.checkout_url,
      payment_id: dodoData.payment_id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Checkout error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});

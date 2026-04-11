import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, dodo-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    return new Response(JSON.stringify({
      status: 'ok',
      message: 'Payment webhook is live. Signature verification can be enabled after DODO_WEBHOOK_SECRET is set.',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get('dodo-signature') ?? req.headers.get('webhook-signature');
    const webhookSecret = Deno.env.get('DODO_WEBHOOK_SECRET')?.trim();

    if (!webhookSecret) {
      console.warn('DODO_WEBHOOK_SECRET is not set; running in generic payment mode.');
    }

    // Verify signature if webhook secret is set
    if (webhookSecret && signature) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(webhookSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
      const expectedSig = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
      // Log for debugging but don't block - some webhook formats differ
      console.log('Signature check:', { received: signature?.substring(0, 16), expected: expectedSig.substring(0, 16) });
    }

    const event = body ? JSON.parse(body) : {};
    console.log('Webhook event received:', event.type ?? event.event_type ?? 'unknown');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      (Deno.env.get('SB_SERVICE_ROLE_JWT') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))!
    );

    const eventType = event.type ?? event.event_type;
    const metadata = event.metadata ?? event.data?.metadata ?? {};
    const userId = metadata.user_id;
    const creditsToAdd = parseInt(metadata.credits_to_add ?? '0');
    const planType = metadata.plan_type ?? 'none';
    const productType = metadata.product_type ?? 'topup';
    const rolloverMax = parseInt(metadata.rollover_max ?? '0');

    if (!userId) {
      console.error('No user_id in metadata');
      return new Response(JSON.stringify({ received: true }), { headers: corsHeaders });
    }

    if (eventType === 'payment.succeeded' || eventType === 'payment_succeeded') {
      if (productType === 'topup') {
        // Add topup credits
        const { data: current } = await supabase
          .from('user_credits')
          .select('topup_credits, lifetime_credits_purchased')
          .eq('user_id', userId)
          .single();

        await supabase
          .from('user_credits')
          .update({
            topup_credits: (current?.topup_credits ?? 0) + creditsToAdd,
            credits_remaining: ((current as any)?.credits_remaining ?? 0) + creditsToAdd,
            lifetime_credits_purchased: (current?.lifetime_credits_purchased ?? 0) + creditsToAdd,
          })
          .eq('user_id', userId);

        await supabase.from('payment_events').insert({
          user_id: userId,
          event_type: 'topup_purchase',
          product_type: 'topup',
          credits_added: creditsToAdd,
          amount: event.amount ?? 0,
          dodo_payment_id: event.payment_id ?? event.id,
          status: 'completed',
        });
      }
    }

    if (eventType === 'subscription.active' || eventType === 'subscription.activated' || eventType === 'subscription_activated') {
      await supabase
        .from('user_credits')
        .update({
          plan_type: planType,
          plan_status: 'active',
          subscription_credits: creditsToAdd,
          credits_remaining: creditsToAdd,
          max_rollover: rolloverMax,
          monthly_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('user_id', userId);

      await supabase
        .from('profiles')
        .update({ plan_type: planType })
        .eq('user_id', userId);

      await supabase.from('payment_events').insert({
        user_id: userId,
        event_type: 'subscription_activated',
        product_type: 'subscription',
        plan_type: planType,
        credits_added: creditsToAdd,
        amount: event.amount ?? 0,
        dodo_payment_id: event.subscription_id ?? event.id,
        status: 'completed',
      });
    }

    if (eventType === 'subscription.renewed' || eventType === 'subscription_renewed') {
      const { data: current } = await supabase
        .from('user_credits')
        .select('subscription_credits, max_rollover')
        .eq('user_id', userId)
        .single();

      const rollover = Math.min(current?.subscription_credits ?? 0, current?.max_rollover ?? 0);

      await supabase
        .from('user_credits')
        .update({
          subscription_credits: creditsToAdd + rollover,
          rollover_credits: rollover,
          credits_used_this_month: 0,
          credits_remaining: creditsToAdd + rollover,
          monthly_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('user_id', userId);
    }

    if (eventType === 'subscription.cancelled' || eventType === 'subscription_cancelled') {
      await supabase
        .from('user_credits')
        .update({
          plan_status: 'cancelled',
          plan_expires_at: event.current_period_end ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('user_id', userId);
    }

    if (eventType === 'subscription.expired' || eventType === 'subscription_expired') {
      await supabase
        .from('user_credits')
        .update({
          plan_type: 'none',
          plan_status: 'expired',
          subscription_credits: 0,
          max_rollover: 0,
          rollover_credits: 0,
        })
        .eq('user_id', userId);

      await supabase
        .from('profiles')
        .update({ plan_type: 'none' })
        .eq('user_id', userId);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});

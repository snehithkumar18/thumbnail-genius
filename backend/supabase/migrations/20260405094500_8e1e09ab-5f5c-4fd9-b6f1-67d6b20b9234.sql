-- Normalize starter credits to 5 and backfill missing profile/credits rows.

ALTER TABLE public.user_credits
  ALTER COLUMN credits_remaining SET DEFAULT 5;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_credits (user_id, credits_remaining, plan_type)
  VALUES (NEW.id, 5, 'free')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure older users missing records can use tools immediately.
INSERT INTO public.profiles (user_id, username, avatar_url)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data->>'avatar_url', NULL)
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

INSERT INTO public.user_credits (
  user_id,
  credits_remaining,
  plan_type,
  subscription_credits,
  topup_credits,
  rollover_credits,
  plan_status,
  max_rollover
)
SELECT
  u.id,
  5,
  'free'::public.plan_type,
  0,
  0,
  0,
  'none',
  0
FROM auth.users u
LEFT JOIN public.user_credits c ON c.user_id = u.id
WHERE c.user_id IS NULL;

-- Give free/no-plan users enough credits to test tools.
UPDATE public.user_credits
SET credits_remaining = GREATEST(COALESCE(credits_remaining, 0), 5)
WHERE plan_type::text IN ('free', 'none')
  AND COALESCE(subscription_credits, 0) = 0
  AND COALESCE(topup_credits, 0) = 0;

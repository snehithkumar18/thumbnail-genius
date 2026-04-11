
-- Add 'none' and 'basic' to plan_type enum
ALTER TYPE public.plan_type ADD VALUE IF NOT EXISTS 'none';
ALTER TYPE public.plan_type ADD VALUE IF NOT EXISTS 'basic';

-- Add new columns to user_credits
ALTER TABLE public.user_credits 
  ADD COLUMN IF NOT EXISTS subscription_credits integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS topup_credits integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plan_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS max_rollover integer NOT NULL DEFAULT 0;

-- Update payment_events to add product_type and amount columns
ALTER TABLE public.payment_events 
  ADD COLUMN IF NOT EXISTS product_type text,
  ADD COLUMN IF NOT EXISTS amount_usd numeric,
  ADD COLUMN IF NOT EXISTS amount_inr numeric;

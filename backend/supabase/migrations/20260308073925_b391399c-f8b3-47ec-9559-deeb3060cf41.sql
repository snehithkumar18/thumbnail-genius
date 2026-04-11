
-- Create plan_type enum
CREATE TYPE public.plan_type AS ENUM ('free', 'creator', 'pro', 'studio');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT,
  avatar_url TEXT,
  plan_type public.plan_type NOT NULL DEFAULT 'free',
  youtube_channel_name TEXT,
  niche_category TEXT,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- USER_CREDITS
-- ============================================================
CREATE TABLE public.user_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  credits_remaining INTEGER NOT NULL DEFAULT 20,
  credits_used_total INTEGER NOT NULL DEFAULT 0,
  credits_used_this_month INTEGER NOT NULL DEFAULT 0,
  plan_type public.plan_type NOT NULL DEFAULT 'free',
  monthly_reset_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  rollover_credits INTEGER NOT NULL DEFAULT 0,
  lifetime_credits_purchased INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credits" ON public.user_credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own credits" ON public.user_credits FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- CREDIT_TRANSACTIONS
-- ============================================================
CREATE TABLE public.credit_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL,
  credits_deducted INTEGER NOT NULL,
  model_used TEXT,
  thumbnail_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions" ON public.credit_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own transactions" ON public.credit_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- FOLDERS
-- ============================================================
CREATE TABLE public.folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '📁',
  thumbnail_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own folders" ON public.folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own folders" ON public.folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own folders" ON public.folders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own folders" ON public.folders FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON public.folders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- THUMBNAILS
-- ============================================================
CREATE TABLE public.thumbnails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT,
  prompt TEXT,
  enhanced_prompt TEXT,
  model_used TEXT,
  style TEXT,
  format_type TEXT NOT NULL DEFAULT '16:9',
  folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  share_id TEXT UNIQUE,
  generation_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.thumbnails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own thumbnails" ON public.thumbnails FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own thumbnails" ON public.thumbnails FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own thumbnails" ON public.thumbnails FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own thumbnails" ON public.thumbnails FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_thumbnails_user_id ON public.thumbnails(user_id);
CREATE INDEX idx_thumbnails_folder_id ON public.thumbnails(folder_id);

-- ============================================================
-- AB_TESTS
-- ============================================================
CREATE TABLE public.ab_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  thumb_a_url TEXT NOT NULL,
  thumb_b_url TEXT NOT NULL,
  share_id TEXT UNIQUE,
  title TEXT,
  votes_a INTEGER NOT NULL DEFAULT 0,
  votes_b INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ab_tests" ON public.ab_tests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own ab_tests" ON public.ab_tests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own ab_tests" ON public.ab_tests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own ab_tests" ON public.ab_tests FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- AB_VOTES
-- ============================================================
CREATE TABLE public.ab_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID REFERENCES public.ab_tests(id) ON DELETE CASCADE NOT NULL,
  choice TEXT NOT NULL CHECK (choice IN ('a', 'b')),
  voter_fingerprint TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ab_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert votes" ON public.ab_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view votes" ON public.ab_votes FOR SELECT USING (true);

-- ============================================================
-- BRAND_KITS
-- ============================================================
CREATE TABLE public.brand_kits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  kit_name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  text_color TEXT,
  font_style TEXT,
  frame_style TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own brand_kits" ON public.brand_kits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own brand_kits" ON public.brand_kits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own brand_kits" ON public.brand_kits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own brand_kits" ON public.brand_kits FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- FACES
-- ============================================================
CREATE TABLE public.faces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  face_url TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.faces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own faces" ON public.faces FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own faces" ON public.faces FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own faces" ON public.faces FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- PAYMENT_EVENTS
-- ============================================================
CREATE TABLE public.payment_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  plan_type public.plan_type,
  credits_added INTEGER,
  dodo_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments" ON public.payment_events FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- REFERRALS
-- ============================================================
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_awarded INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referrals" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id);
CREATE POLICY "Users can insert referrals" ON public.referrals FOR INSERT WITH CHECK (auth.uid() = referrer_id);

-- ============================================================
-- AUTO-CREATE PROFILE + CREDITS ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  );
  
  INSERT INTO public.user_credits (user_id, credits_remaining, plan_type)
  VALUES (NEW.id, 20, 'free');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

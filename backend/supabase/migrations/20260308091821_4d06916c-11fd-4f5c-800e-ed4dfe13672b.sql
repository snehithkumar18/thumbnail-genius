CREATE TABLE public.trending_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  niche text NOT NULL DEFAULT 'all',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(niche)
);

ALTER TABLE public.trending_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read trending cache" ON public.trending_cache FOR SELECT TO anon, authenticated USING (true);
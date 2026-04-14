-- TABLE: ai_generation_cache
CREATE TABLE IF NOT EXISTS public.ai_generation_cache (
    cache_key text PRIMARY KEY,
    feature text NOT NULL,
    input_hash text NOT NULL,
    provider text NOT NULL,
    model_used text NOT NULL,
    image_url text NOT NULL,
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS ai_generation_cache_expires_at_idx
    ON public.ai_generation_cache (expires_at);

ALTER TABLE public.ai_generation_cache ENABLE ROW LEVEL SECURITY;

-- TABLE: ai_provider_status
CREATE TABLE IF NOT EXISTS public.ai_provider_status (
    provider text PRIMARY KEY,
    last_rate_limit_at timestamptz,
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.ai_provider_status ENABLE ROW LEVEL SECURITY;

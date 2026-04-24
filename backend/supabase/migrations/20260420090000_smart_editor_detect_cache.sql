CREATE TABLE IF NOT EXISTS public.smart_editor_detect_cache (
    image_hash text PRIMARY KEY,
    layers_json jsonb NOT NULL,
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS smart_editor_detect_cache_expires_at_idx
    ON public.smart_editor_detect_cache (expires_at);

ALTER TABLE public.smart_editor_detect_cache ENABLE ROW LEVEL SECURITY;

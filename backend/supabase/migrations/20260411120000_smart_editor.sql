-- TABLE: smart_editor_sessions
CREATE TABLE IF NOT EXISTS public.smart_editor_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users not null,
    original_image_url text not null,
    current_image_url text not null,
    source_type text default 'upload',
    thumbnail_id uuid references public.thumbnails(id) null,
    layers_data jsonb default '[]'::jsonb,
    edit_history jsonb default '[]'::jsonb,
    credits_used integer default 0,
    status text default 'active',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- TABLE: smart_editor_layers
CREATE TABLE IF NOT EXISTS public.smart_editor_layers (
    id uuid primary key default gen_random_uuid(),
    session_id uuid references public.smart_editor_sessions(id) on delete cascade,
    user_id uuid references auth.users not null,
    layer_index integer not null,
    layer_type text not null,
    label text not null,
    original_content text null,
    mask_image_url text null,
    bounding_box jsonb null,
    thumbnail_url text null,
    is_visible boolean default true,
    is_locked boolean default false,
    is_edited boolean default false,
    replacement_url text null,
    created_at timestamptz default now()
);

-- TABLE: smart_editor_edits
CREATE TABLE IF NOT EXISTS public.smart_editor_edits (
    id uuid primary key default gen_random_uuid(),
    session_id uuid references public.smart_editor_sessions(id) on delete cascade,
    user_id uuid references auth.users not null,
    layer_id uuid references public.smart_editor_layers(id) on delete set null,
    edit_type text not null,
    instruction text null,
    before_image_url text not null,
    after_image_url text not null,
    credits_charged integer not null,
    api_cost_usd numeric(10,4),
    created_at timestamptz default now()
);

-- Enable RLS
ALTER TABLE public.smart_editor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_editor_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_editor_edits ENABLE ROW LEVEL SECURITY;

-- Policies for smart_editor_sessions
CREATE POLICY "Users can manage their own smart_editor_sessions"
    ON public.smart_editor_sessions AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policies for smart_editor_layers
CREATE POLICY "Users can manage their own smart_editor_layers"
    ON public.smart_editor_layers AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policies for smart_editor_edits
CREATE POLICY "Users can manage their own smart_editor_edits"
    ON public.smart_editor_edits AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

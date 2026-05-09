-- Waitlist table for pre-launch signups
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  whatsapp_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anon) to INSERT into waitlist
CREATE POLICY "Anyone can join waitlist"
  ON public.waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Block all reads from the public — only service_role can read
-- (No SELECT policy = no one can read via the API)

-- Add an index on email for fast duplicate checks
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON public.waitlist (email);

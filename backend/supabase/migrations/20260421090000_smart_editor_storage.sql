-- Create storage bucket for smart editor masks and edited images
INSERT INTO storage.buckets (id, name, public)
VALUES ('smart_editor', 'smart_editor', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder within smart_editor bucket
CREATE POLICY "Users can upload their own smart editor assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'smart_editor' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Public read access for smart editor assets
CREATE POLICY "Smart editor assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'smart_editor');

-- Users can delete their own smart editor assets
CREATE POLICY "Users can delete their own smart editor assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'smart_editor' AND auth.uid()::text = (storage.foldername(name))[1]);

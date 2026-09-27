-- ==============================================================================
-- Run this in Supabase Dashboard -> SQL Editor to enable Media & Photos Storage
-- ==============================================================================

-- 1. Add 'media' JSON column to the vehicles table
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS media JSONB DEFAULT '[]'::jsonb;

-- 2. Create the 'vehicle-media' storage bucket for photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-media', 'vehicle-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Storage Policies (Allow public view; authenticated upload and delete)
DROP POLICY IF EXISTS "Public vehicle media read access" ON storage.objects;
DROP POLICY IF EXISTS "Public vehicle media upload access" ON storage.objects;
DROP POLICY IF EXISTS "Public vehicle media delete access" ON storage.objects;
DROP POLICY IF EXISTS "Vehicle media read access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated vehicle media upload access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated vehicle media delete access" ON storage.objects;

CREATE POLICY "Vehicle media read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'vehicle-media');

CREATE POLICY "Authenticated vehicle media upload access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vehicle-media');

CREATE POLICY "Authenticated vehicle media delete access"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vehicle-media');

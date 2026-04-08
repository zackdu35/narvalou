-- 📜 SUPABASE SETUP SCRIPT (Run this in the Supabase SQL Editor)
-- This ensures the 'campaign-assets' bucket exists and has correct permissions.

-- 1. Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-assets', 'campaign-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Allow public access to read images (Required for scene display)
-- Check if policy exists first to avoid errors
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND policyname = 'Public Access'
    ) THEN
        CREATE POLICY "Public Access" ON storage.objects
        FOR SELECT USING (bucket_id = 'campaign-assets');
    END IF;
END $$;

-- 3. Allow the service role (used by our proxy) to manage everything
-- The service role usually bypasses RLS, but explicit policies help in some environments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND policyname = 'Admin Full Access'
    ) THEN
        CREATE POLICY "Admin Full Access" ON storage.objects
        FOR ALL USING (bucket_id = 'campaign-assets')
        WITH CHECK (bucket_id = 'campaign-assets');
    END IF;
END $$;

-- 4. RLS is usually enabled by default on storage tables.
-- If you get a 'must be owner' error, it's because it's already managed by Supabase.

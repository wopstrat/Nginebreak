-- ==============================================================================
-- NGINEBREAK: Admin Settings & Profiles Realtime Setup
--
-- Run this ONCE in your Supabase Dashboard:
--   SQL Editor -> New Query -> Paste -> Click "Run"
--
-- This script fixes:
--   1. Missing columns (is_admin, role) on public.profiles table
--   2. admin_settings table creation & security policies
--   3. Supabase Realtime live sync for admin settings and user profiles
-- ==============================================================================

-- 1. Ensure profiles table has is_admin and role columns
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Member',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';

-- Automatically grant admin rights to primary admin email if profile exists
UPDATE public.profiles
SET is_admin = true, role = 'admin'
WHERE LOWER(email) = 'wopstrat@gmail.com';

-- 2. Create admin_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.admin_settings (
    id integer PRIMARY KEY DEFAULT 1,
    settings jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT single_row CHECK (id = 1)
);

-- Initialize default admin settings row
INSERT INTO public.admin_settings (id, settings)
VALUES (1, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 3. Row Level Security (RLS) Policies
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON public.admin_settings;
DROP POLICY IF EXISTS "Enable update for admins only" ON public.admin_settings;
DROP POLICY IF EXISTS "Enable insert for admins only" ON public.admin_settings;

-- Allow all authenticated/anon users to read admin settings
CREATE POLICY "Enable read access for all users" ON public.admin_settings FOR SELECT USING (true);

-- Allow admins to update admin settings
CREATE POLICY "Enable update for admins only" ON public.admin_settings FOR UPDATE USING (
    auth.jwt() ->> 'email' = 'wopstrat@gmail.com' OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.is_admin = true OR profiles.role = 'admin'))
);

CREATE POLICY "Enable insert for admins only" ON public.admin_settings FOR INSERT WITH CHECK (
    auth.jwt() ->> 'email' = 'wopstrat@gmail.com' OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.is_admin = true OR profiles.role = 'admin'))
);

-- Ensure profiles RLS permits read access for profile lookup and realtime sync
DROP POLICY IF EXISTS "Public profiles read access" ON public.profiles;
CREATE POLICY "Public profiles read access" ON public.profiles FOR SELECT USING (true);

-- 4. Enable Realtime replication with FULL identity
ALTER TABLE public.admin_settings REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- 5. Add tables to the Supabase Realtime publication safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'admin_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_settings;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;

-- Verify setup
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

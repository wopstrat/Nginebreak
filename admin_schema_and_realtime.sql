-- ==============================================================================
-- NGINEBREAK: Admin Settings, Profiles & Version History Realtime Setup
--
-- Run this ONCE in your Supabase Dashboard:
--   SQL Editor -> New Query -> Paste -> Click "Run"
--
-- This script sets up:
--   1. profiles table (is_admin, role columns)
--   2. admin_settings table & RLS policies
--   3. app_releases table for version history & PWA release updates
--   4. Supabase Realtime live sync across devices
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

-- 3. Create app_releases table for Version History
CREATE TABLE IF NOT EXISTS public.app_releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL UNIQUE,
    release_date DATE NOT NULL DEFAULT CURRENT_DATE,
    title TEXT NOT NULL,
    description TEXT,
    release_type TEXT NOT NULL DEFAULT 'minor' CHECK (release_type IN ('major', 'minor', 'patch', 'hotfix')),
    created_by TEXT DEFAULT 'Admin',
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Row Level Security (RLS) Policies
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_releases ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON public.admin_settings;
DROP POLICY IF EXISTS "Enable update for admins only" ON public.admin_settings;
DROP POLICY IF EXISTS "Enable insert for admins only" ON public.admin_settings;

DROP POLICY IF EXISTS "Public profiles read access" ON public.profiles;

DROP POLICY IF EXISTS "Enable read access for all users on app_releases" ON public.app_releases;
DROP POLICY IF EXISTS "Enable write access for admins on app_releases" ON public.app_releases;

-- Admin Settings Policies
CREATE POLICY "Enable read access for all users" ON public.admin_settings FOR SELECT USING (true);

CREATE POLICY "Enable update for admins only" ON public.admin_settings FOR UPDATE USING (
    auth.jwt() ->> 'email' = 'wopstrat@gmail.com' OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.is_admin = true OR profiles.role = 'admin'))
);

CREATE POLICY "Enable insert for admins only" ON public.admin_settings FOR INSERT WITH CHECK (
    auth.jwt() ->> 'email' = 'wopstrat@gmail.com' OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.is_admin = true OR profiles.role = 'admin'))
);

-- Profiles Policy
CREATE POLICY "Public profiles read access" ON public.profiles FOR SELECT USING (true);

-- App Releases Policies
CREATE POLICY "Enable read access for all users on app_releases" ON public.app_releases FOR SELECT USING (true);

CREATE POLICY "Enable write access for admins on app_releases" ON public.app_releases FOR ALL USING (
    auth.jwt() ->> 'email' = 'wopstrat@gmail.com' OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.is_admin = true OR profiles.role = 'admin'))
);

-- 5. Enable Realtime replication with FULL identity
ALTER TABLE public.admin_settings REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.app_releases REPLICA IDENTITY FULL;

-- 6. Add tables to the Supabase Realtime publication safely
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

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'app_releases'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_releases;
  END IF;
END $$;

-- 7. Seed Initial Releases Data
INSERT INTO public.app_releases (version, release_date, title, description, release_type, created_by, is_current)
VALUES 
('1.4.0', '2026-09-24', 'Application Update System & Realtime Sync', '• Production-ready PWA background update detection\n• Admin Version History management\n• Safe non-intrusive update prompt', 'minor', 'Admin', true),
('1.3.2', '2026-09-18', 'Shared Garage & Profile Sync', '• Multi-user collaboration for family & fleet garages\n• Real-time vehicle sync across members', 'patch', 'Admin', false),
('1.3.1', '2026-09-12', 'PWA Offline & Notification Engine', '• Web push notifications for upcoming maintenance\n• Background service worker caching', 'patch', 'Admin', false),
('1.3.0', '2026-09-05', 'Maintenance & Odometer Tracking', '• Core vehicle lifecycle management\n• Odometer log tracking and service intervals', 'minor', 'Admin', false)
ON CONFLICT (version) DO NOTHING;

-- Verify setup
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

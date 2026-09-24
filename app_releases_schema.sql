-- ==============================================================================
-- NGINEBREAK: Application Releases & Version History Setup
--
-- Run this in your Supabase Dashboard:
--   SQL Editor -> New Query -> Paste -> Click "Run"
-- ==============================================================================

-- 1. Create app_releases table
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

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.app_releases ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable read access for all users on app_releases" ON public.app_releases;
DROP POLICY IF EXISTS "Enable write access for admins on app_releases" ON public.app_releases;

-- Read policy: All users (auth + anon) can view version history & release notes
CREATE POLICY "Enable read access for all users on app_releases" 
ON public.app_releases FOR SELECT USING (true);

-- Write policy: Only admins can add, update or delete release records
CREATE POLICY "Enable write access for admins on app_releases" 
ON public.app_releases FOR ALL USING (
    auth.jwt() ->> 'email' = 'wopstrat@gmail.com' OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.is_admin = true OR profiles.role = 'admin'))
);

-- 3. Enable Realtime replication with FULL identity
ALTER TABLE public.app_releases REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'app_releases'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_releases;
  END IF;
END $$;

-- 4. Initial Seed Data (History)
INSERT INTO public.app_releases (version, release_date, title, description, release_type, created_by, is_current)
VALUES 
('1.4.0', '2026-09-24', 'Application Update System & Realtime Sync', 'Added PWA background update detection, admin version history management, and live schema sync across devices.', 'minor', 'Admin', true),
('1.3.2', '2026-09-18', 'Shared Garage & Profile Sync', 'Multi-user collaboration, real-time vehicle sync across garage members.', 'patch', 'Admin', false),
('1.3.1', '2026-09-12', 'PWA Offline & Notification Engine', 'Enhanced web push notifications, background service worker caching.', 'patch', 'Admin', false),
('1.3.0', '2026-09-05', 'Maintenance & Odometer Tracking', 'Core vehicle lifecycle management, odometer tracking, and service intervals.', 'minor', 'Admin', false)
ON CONFLICT (version) DO NOTHING;

-- Verify setup
SELECT version, title, release_type, release_date, is_current FROM public.app_releases ORDER BY release_date DESC;

-- ==============================================================================
-- NGINEBREAK: Complete Database Schema for Supabase
-- Paste this entire script into your Supabase Dashboard:
-- SQL Editor -> New Query -> Paste -> Click "Run"
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Profiles Table (stores user display names and emails for collaboration)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Member',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure email, is_admin, and role columns exist on profiles if table was created previously
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT DEFAULT 'Member';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';

-- 3. Automatic Profile Sync Trigger from auth.users
-- Whenever any user signs up or updates in Supabase Auth, they are automatically in public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1), 'Member'),
    LOWER(TRIM(NEW.email))
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Backfill all existing registered users (e.g. test1@gmail.com) into public.profiles
INSERT INTO public.profiles (id, display_name, email)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'display_name', split_part(email, '@', 1), 'Member'),
  LOWER(TRIM(email))
FROM auth.users
ON CONFLICT (id) DO UPDATE 
SET 
  email = EXCLUDED.email,
  display_name = COALESCE(EXCLUDED.display_name, profiles.display_name);

-- 5. RPC Lookup Helper (allows finding users by email safely even if profile sync was delayed)
CREATE OR REPLACE FUNCTION public.lookup_user_by_email(lookup_email TEXT)
RETURNS TABLE (id UUID, display_name TEXT, email TEXT) 
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  -- Restrict execution to authenticated users only
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- 1. Try finding in profiles
  RETURN QUERY
  SELECT p.id, p.display_name, p.email
  FROM public.profiles p
  WHERE lower(trim(p.email)) = lower(trim(lookup_email))
  LIMIT 1;

  -- 2. If not found in profiles, check auth.users directly and self-heal
  IF NOT FOUND THEN
    INSERT INTO public.profiles (id, display_name, email)
    SELECT 
      u.id, 
      COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1), 'Member'),
      lower(trim(u.email))
    FROM auth.users u
    WHERE lower(trim(u.email)) = lower(trim(lookup_email))
    ON CONFLICT (id) DO UPDATE 
    SET email = EXCLUDED.email;

    RETURN QUERY
    SELECT p.id, p.display_name, p.email
    FROM public.profiles p
    WHERE lower(trim(p.email)) = lower(trim(lookup_email))
    LIMIT 1;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.lookup_user_by_email(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_user_by_email(TEXT) TO authenticated;

-- 6. Vehicles Table
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'Car',
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  current_odometer INTEGER NOT NULL DEFAULT 0,
  media JSONB DEFAULT '[]'::jsonb,
  members JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist even if vehicles table was created in an earlier migration
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS media JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS members JSONB DEFAULT '[]'::jsonb;

-- 7. Garage Members Table (multi-user shared access to vehicles)
CREATE TABLE IF NOT EXISTS public.garage_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner' | 'member'
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(vehicle_id, user_id)
);

-- 8. Maintenance Modules Table (rules/schedules per vehicle)
CREATE TABLE IF NOT EXISTS public.maintenance_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  interval_km INTEGER,
  interval_months INTEGER,
  last_service_km INTEGER,
  last_service_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Service History Table (completed logs)
CREATE TABLE IF NOT EXISTS public.service_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.maintenance_modules(id) ON DELETE SET NULL,
  module_name TEXT NOT NULL,
  odometer INTEGER NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Odometer History Table (tamper-evident audit log)
CREATE TABLE IF NOT EXISTS public.odometer_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  added_by_name TEXT NOT NULL DEFAULT 'Unknown',
  odometer_value INTEGER NOT NULL,
  previous_value INTEGER NOT NULL DEFAULT 0,
  is_rewound BOOLEAN NOT NULL DEFAULT FALSE,
  rewound_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garage_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.odometer_history ENABLE ROW LEVEL SECURITY;

-- 12. Production Row Level Security Policies
-- PROFILES:
DROP POLICY IF EXISTS "profiles_dev_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_read" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- VEHICLES:
DROP POLICY IF EXISTS "vehicles_dev_all" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_select" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_insert" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_update" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_delete" ON public.vehicles;

CREATE POLICY "vehicles_select" ON public.vehicles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.garage_members gm
      WHERE gm.vehicle_id = vehicles.id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "vehicles_insert" ON public.vehicles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "vehicles_update" ON public.vehicles
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.garage_members gm
      WHERE gm.vehicle_id = vehicles.id AND gm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.garage_members gm
      WHERE gm.vehicle_id = vehicles.id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "vehicles_delete" ON public.vehicles
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- GARAGE MEMBERS:
DROP POLICY IF EXISTS "garage_members_dev_all" ON public.garage_members;
DROP POLICY IF EXISTS "garage_members_select" ON public.garage_members;
DROP POLICY IF EXISTS "garage_members_insert" ON public.garage_members;
DROP POLICY IF EXISTS "garage_members_delete" ON public.garage_members;

CREATE POLICY "garage_members_select" ON public.garage_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.id = garage_members.vehicle_id AND v.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.garage_members gm
      WHERE gm.vehicle_id = garage_members.vehicle_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "garage_members_insert" ON public.garage_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.id = garage_members.vehicle_id AND v.user_id = auth.uid()
    )
  );

CREATE POLICY "garage_members_delete" ON public.garage_members
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.id = garage_members.vehicle_id AND v.user_id = auth.uid()
    )
  );

-- MAINTENANCE MODULES:
DROP POLICY IF EXISTS "maintenance_dev_all" ON public.maintenance_modules;
DROP POLICY IF EXISTS "maintenance_modules_select" ON public.maintenance_modules;
DROP POLICY IF EXISTS "maintenance_modules_modify" ON public.maintenance_modules;

CREATE POLICY "maintenance_modules_select" ON public.maintenance_modules
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.id = maintenance_modules.vehicle_id AND (
        v.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.garage_members gm
          WHERE gm.vehicle_id = v.id AND gm.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "maintenance_modules_modify" ON public.maintenance_modules
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.id = maintenance_modules.vehicle_id AND (
        v.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.garage_members gm
          WHERE gm.vehicle_id = v.id AND gm.user_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.id = maintenance_modules.vehicle_id AND (
        v.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.garage_members gm
          WHERE gm.vehicle_id = v.id AND gm.user_id = auth.uid()
        )
      )
    )
  );

-- SERVICE HISTORY:
DROP POLICY IF EXISTS "service_history_dev_all" ON public.service_history;
DROP POLICY IF EXISTS "service_history_select" ON public.service_history;
DROP POLICY IF EXISTS "service_history_modify" ON public.service_history;

CREATE POLICY "service_history_select" ON public.service_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.id = service_history.vehicle_id AND (
        v.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.garage_members gm
          WHERE gm.vehicle_id = v.id AND gm.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "service_history_modify" ON public.service_history
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.id = service_history.vehicle_id AND (
        v.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.garage_members gm
          WHERE gm.vehicle_id = v.id AND gm.user_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.id = service_history.vehicle_id AND (
        v.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.garage_members gm
          WHERE gm.vehicle_id = v.id AND gm.user_id = auth.uid()
        )
      )
    )
  );

-- ODOMETER HISTORY:
DROP POLICY IF EXISTS "odometer_history_dev_all" ON public.odometer_history;
DROP POLICY IF EXISTS "odometer_history_select" ON public.odometer_history;
DROP POLICY IF EXISTS "odometer_history_insert" ON public.odometer_history;
DROP POLICY IF EXISTS "odometer_history_no_delete" ON public.odometer_history;
DROP POLICY IF EXISTS "odometer_history_no_update" ON public.odometer_history;

CREATE POLICY "odometer_history_select" ON public.odometer_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.id = odometer_history.vehicle_id AND (
        v.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.garage_members gm
          WHERE gm.vehicle_id = v.id AND gm.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "odometer_history_insert" ON public.odometer_history
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.id = odometer_history.vehicle_id AND (
        v.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.garage_members gm
          WHERE gm.vehicle_id = v.id AND gm.user_id = auth.uid()
        )
      )
    )
  );

-- Tamper-evident: disallow modification and deletion of odometer history
CREATE POLICY "odometer_history_no_delete" ON public.odometer_history
  FOR DELETE TO authenticated
  USING (false);

CREATE POLICY "odometer_history_no_update" ON public.odometer_history
  FOR UPDATE TO authenticated
  USING (false);

-- 13. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_user ON public.vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_garage_members_vehicle ON public.garage_members(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_garage_members_user ON public.garage_members(user_id);
CREATE INDEX IF NOT EXISTS idx_modules_vehicle ON public.maintenance_modules(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_history_vehicle ON public.service_history(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_odometer_history_vehicle ON public.odometer_history(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_odometer_history_created ON public.odometer_history(vehicle_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 14. Storage Bucket for Vehicle Photos & Receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-media', 'vehicle-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public vehicle media read access" ON storage.objects;
DROP POLICY IF EXISTS "Public vehicle media upload access" ON storage.objects;
DROP POLICY IF EXISTS "Public vehicle media delete access" ON storage.objects;
DROP POLICY IF EXISTS "Vehicle media read access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated vehicle media upload access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated vehicle media delete access" ON storage.objects;

-- Anyone can view public vehicle photos
CREATE POLICY "Vehicle media read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'vehicle-media');

-- Authenticated users only can upload vehicle media
CREATE POLICY "Authenticated vehicle media upload access"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'vehicle-media');

-- Authenticated users can delete vehicle media
CREATE POLICY "Authenticated vehicle media delete access"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'vehicle-media');

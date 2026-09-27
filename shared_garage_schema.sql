-- ==============================================================================
-- NGINEBREAK - Shared Garage Schema Extension
-- Run this in Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

-- 1. Profiles table (synced from auth.users on register)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Garage Members (shared access to a vehicle)
CREATE TABLE IF NOT EXISTS public.garage_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner' | 'member'
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(vehicle_id, user_id)
);

-- 3. Odometer History (append-only log, never deleted)
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

-- 4. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garage_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.odometer_history ENABLE ROW LEVEL SECURITY;

-- 5. Production Row Level Security Policies
DROP POLICY IF EXISTS "profiles_all" ON public.profiles;
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

DROP POLICY IF EXISTS "garage_members_all" ON public.garage_members;
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

DROP POLICY IF EXISTS "odometer_history_all" ON public.odometer_history;
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

CREATE POLICY "odometer_history_no_delete" ON public.odometer_history
  FOR DELETE TO authenticated
  USING (false);

CREATE POLICY "odometer_history_no_update" ON public.odometer_history
  FOR UPDATE TO authenticated
  USING (false);

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_garage_members_vehicle ON public.garage_members(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_garage_members_user ON public.garage_members(user_id);
CREATE INDEX IF NOT EXISTS idx_odometer_history_vehicle ON public.odometer_history(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_odometer_history_created ON public.odometer_history(vehicle_id, created_at DESC);

-- 7. Add user_id column to vehicles if not already present (for backward compat)
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 8. Add email column to profiles for invite lookup
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

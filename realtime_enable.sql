-- ==============================================================================
-- NGINEBREAK: Enable Supabase Realtime for Live Multi-User Garage Updates
--
-- Run this ONCE in your Supabase Dashboard:
--   SQL Editor -> New Query -> Paste -> Click "Run"
--
-- This is REQUIRED for the live update feature to work. Without this,
-- Supabase Realtime will not broadcast changes from these tables.
-- ==============================================================================

-- Enable Realtime replication with FULL identity so update payloads include all columns
ALTER TABLE public.vehicles REPLICA IDENTITY FULL;
ALTER TABLE public.odometer_history REPLICA IDENTITY FULL;
ALTER TABLE public.maintenance_modules REPLICA IDENTITY FULL;
ALTER TABLE public.service_history REPLICA IDENTITY FULL;

-- Add tables to the Supabase Realtime publication safely (checks if already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'vehicles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicles;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'odometer_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.odometer_history;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'maintenance_modules'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_modules;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'service_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.service_history;
  END IF;
END $$;

-- Verify: check which tables are now in the realtime publication
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;


-- ============================================================
-- MediOS — Stores table for multi-store management
-- Run in Supabase SQL Editor after schema.sql
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'store_status') THEN
    CREATE TYPE public.store_status AS ENUM ('live', 'suspended', 'inactive', 'pending');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  phone TEXT,
  license_number TEXT NOT NULL,
  logo_url TEXT,
  status public.store_status NOT NULL DEFAULT 'pending',
  subscription_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.stores_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS stores_set_updated_at ON public.stores;
CREATE TRIGGER stores_set_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.stores_set_updated_at();

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on stores" ON public.stores;
CREATE POLICY "Service role full access on stores"
  ON public.stores
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Store admins can read own store" ON public.stores;
CREATE POLICY "Store admins can read own store"
  ON public.stores
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT store_id FROM public.profiles
      WHERE id = auth.uid() AND store_id IS NOT NULL
    )
  );

CREATE INDEX IF NOT EXISTS stores_status_idx ON public.stores (status);
CREATE INDEX IF NOT EXISTS stores_name_idx ON public.stores (name);

-- Link profiles.store_id to stores (optional, safe if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_store_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_store_id_fkey
      FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;
  END IF;
END $$;

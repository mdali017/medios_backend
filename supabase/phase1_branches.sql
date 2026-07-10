-- ============================================================
-- MediOS Phase 1 — Branches (run this ENTIRE file once)
-- Supabase Dashboard → SQL Editor → paste all → Run
-- Safe to re-run (idempotent)
-- ============================================================

-- ------------------------------------------------------------
-- 1) branch_status enum + branches table
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'branch_status') THEN
    CREATE TYPE public.branch_status AS ENUM ('active', 'inactive');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.branches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  address     TEXT NOT NULL,
  city        TEXT,
  phone       TEXT,
  status      public.branch_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.branches_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS branches_set_updated_at ON public.branches;
CREATE TRIGGER branches_set_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.branches_set_updated_at();

CREATE INDEX IF NOT EXISTS branches_store_id_idx ON public.branches (store_id);
CREATE INDEX IF NOT EXISTS branches_status_idx ON public.branches (status);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on branches" ON public.branches;
CREATE POLICY "Service role full access on branches"
  ON public.branches FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Store staff can read own branches" ON public.branches;
CREATE POLICY "Store staff can read own branches"
  ON public.branches FOR SELECT TO authenticated
  USING (
    store_id IN (
      SELECT store_id FROM public.profiles
      WHERE id = auth.uid() AND store_id IS NOT NULL
    )
  );

-- ------------------------------------------------------------
-- 2) New roles on user_role enum
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'branch_manager'
      AND enumtypid = 'public.user_role'::regtype
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'branch_manager';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'seller'
      AND enumtypid = 'public.user_role'::regtype
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'seller';
  END IF;
END $$;

-- ------------------------------------------------------------
-- 3) profiles.branch_id
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS branch_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_branch_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_branch_id_fkey
      FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS profiles_branch_id_idx ON public.profiles (branch_id);

-- ------------------------------------------------------------
-- 4) products.branch_id (nullable — null = store-level, no branch)
-- ------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS branch_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'products_branch_id_fkey'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_branch_id_fkey
      FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS products_branch_id_idx ON public.products (branch_id);
CREATE INDEX IF NOT EXISTS products_store_branch_idx ON public.products (store_id, branch_id);

-- ------------------------------------------------------------
-- 5) orders.branch_id
-- ------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS branch_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'orders_branch_id_fkey'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_branch_id_fkey
      FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS orders_branch_id_idx ON public.orders (branch_id);

-- ------------------------------------------------------------
-- 6) stock_requests.branch_id
-- ------------------------------------------------------------
ALTER TABLE public.stock_requests
  ADD COLUMN IF NOT EXISTS branch_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'stock_requests_branch_id_fkey'
  ) THEN
    ALTER TABLE public.stock_requests
      ADD CONSTRAINT stock_requests_branch_id_fkey
      FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS stock_requests_branch_id_idx ON public.stock_requests (branch_id);

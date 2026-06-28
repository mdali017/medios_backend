-- ============================================================
-- MediOS — Products / Medicines table for store inventory
-- Run in Supabase SQL Editor after stores.sql
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_unit_type') THEN
    CREATE TYPE public.product_unit_type AS ENUM (
      'tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'other'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  generic_name TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  category TEXT,
  company TEXT,
  unit_type public.product_unit_type NOT NULL DEFAULT 'tablet',
  description TEXT,
  price_single NUMERIC(12, 2) NOT NULL CHECK (price_single >= 0),
  price_pata NUMERIC(12, 2) CHECK (price_pata IS NULL OR price_pata >= 0),
  price_box NUMERIC(12, 2) CHECK (price_box IS NULL OR price_box >= 0),
  cost_price_single NUMERIC(12, 2) CHECK (cost_price_single IS NULL OR cost_price_single >= 0),
  tax_percent NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (tax_percent >= 0 AND tax_percent <= 100),
  tablets_per_strip INTEGER NOT NULL DEFAULT 10 CHECK (tablets_per_strip >= 1),
  strips_per_box INTEGER NOT NULL DEFAULT 10 CHECK (strips_per_box >= 1),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  batch_number TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.products_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_set_updated_at ON public.products;
CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.products_set_updated_at();

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on products" ON public.products;
CREATE POLICY "Service role full access on products"
  ON public.products
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Store staff can read own store products" ON public.products;
CREATE POLICY "Store staff can read own store products"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (
    store_id IN (
      SELECT store_id FROM public.profiles
      WHERE id = auth.uid() AND store_id IS NOT NULL
    )
  );

CREATE INDEX IF NOT EXISTS products_store_id_idx ON public.products (store_id);
CREATE INDEX IF NOT EXISTS products_product_name_idx ON public.products (product_name);
CREATE INDEX IF NOT EXISTS products_generic_name_idx ON public.products (generic_name);
CREATE INDEX IF NOT EXISTS products_brand_name_idx ON public.products (brand_name);
CREATE INDEX IF NOT EXISTS products_expiry_date_idx ON public.products (expiry_date);
CREATE INDEX IF NOT EXISTS products_store_name_idx ON public.products (store_id, product_name);

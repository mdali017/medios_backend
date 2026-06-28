-- ============================================================
-- MediOS — Stock / emergency need requests from POS
-- Run in Supabase SQL Editor after products.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.stock_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_qty INTEGER NOT NULL CHECK (requested_qty > 0),
  request_type TEXT NOT NULL DEFAULT 'emergency' CHECK (request_type IN ('emergency', 'restock')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled')),
  notes TEXT,
  admin_note TEXT,
  current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.stock_requests_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS stock_requests_set_updated_at ON public.stock_requests;
CREATE TRIGGER stock_requests_set_updated_at
  BEFORE UPDATE ON public.stock_requests
  FOR EACH ROW EXECUTE FUNCTION public.stock_requests_set_updated_at();

ALTER TABLE public.stock_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on stock_requests" ON public.stock_requests;
CREATE POLICY "Service role full access on stock_requests"
  ON public.stock_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS stock_requests_store_id_idx ON public.stock_requests (store_id);
CREATE INDEX IF NOT EXISTS stock_requests_status_idx ON public.stock_requests (status);
CREATE INDEX IF NOT EXISTS stock_requests_request_type_idx ON public.stock_requests (request_type);
CREATE INDEX IF NOT EXISTS stock_requests_created_at_idx ON public.stock_requests (created_at DESC);

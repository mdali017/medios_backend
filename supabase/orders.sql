-- ============================================================
-- MediOS — Orders + Order Items for POS checkout
-- Run in Supabase SQL Editor after products.sql
-- ============================================================

-- Sale unit matches POS frontend: tablet | strip (pata) | box
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_sale_unit') THEN
    CREATE TYPE public.order_sale_unit AS ENUM ('tablet', 'strip', 'box');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_type') THEN
    CREATE TYPE public.order_type AS ENUM ('pos', 'online');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE public.order_status AS ENUM (
      'completed',   -- POS: paid & stock deducted immediately
      'pending',     -- online: awaiting approval
      'approved',
      'in_delivery',
      'cancelled'
    );
  END IF;
END $$;

-- ------------------------------------------------------------
-- orders — one row per checkout / sale
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  order_number TEXT NOT NULL,
  order_type public.order_type NOT NULL DEFAULT 'pos',
  status public.order_status NOT NULL DEFAULT 'completed',
  sold_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  item_count INTEGER NOT NULL DEFAULT 0 CHECK (item_count >= 0),
  unit_count INTEGER NOT NULL DEFAULT 0 CHECK (unit_count >= 0),
  notes TEXT,
  delivery_address TEXT,
  delivery_staff_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT orders_order_number_store_unique UNIQUE (store_id, order_number),
  CONSTRAINT orders_total_matches CHECK (total_amount = subtotal + tax_amount)
);

-- ------------------------------------------------------------
-- order_items — line items (snapshot prices at sale time)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  generic_name TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  sale_unit public.order_sale_unit NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity >= 1),
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  unit_tax NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_tax >= 0),
  line_subtotal NUMERIC(12, 2) NOT NULL CHECK (line_subtotal >= 0),
  line_tax NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (line_tax >= 0),
  line_total NUMERIC(12, 2) NOT NULL CHECK (line_total >= 0),
  tablets_per_unit INTEGER NOT NULL CHECK (tablets_per_unit >= 1),
  tablets_deducted INTEGER NOT NULL CHECK (tablets_deducted >= 1),
  batch_number TEXT,
  expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT order_items_line_total_matches CHECK (line_total = line_subtotal + line_tax),
  CONSTRAINT order_items_tablets_deducted_matches CHECK (tablets_deducted = quantity * tablets_per_unit)
);

-- ------------------------------------------------------------
-- updated_at triggers
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.orders_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_set_updated_at ON public.orders;
CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_set_updated_at();

-- ------------------------------------------------------------
-- Generate readable order number per store per day
-- Example: POS-20260622-0001
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_order_number(p_store_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_date_prefix TEXT := TO_CHAR(NOW(), 'YYYYMMDD');
  v_seq INTEGER;
BEGIN
  SELECT COALESCE(MAX(
    NULLIF(REGEXP_REPLACE(order_number, '.*-', ''), '')::INTEGER
  ), 0) + 1
  INTO v_seq
  FROM public.orders
  WHERE store_id = p_store_id
    AND order_number LIKE 'POS-' || v_date_prefix || '-%';

  RETURN 'POS-' || v_date_prefix || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$;

-- ------------------------------------------------------------
-- Atomic POS checkout: insert order + items + deduct stock
--
-- p_items JSONB array shape (matches POS cart):
-- [
--   {
--     "productId": "uuid",
--     "saleUnit": "tablet" | "strip" | "box",
--     "quantity": 3,
--     "unitPrice": 8.84,
--     "unitTax": 0,
--     "tabletsPerUnit": 1
--   }
-- ]
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_pos_order(
  p_store_id UUID,
  p_sold_by UUID,
  p_items JSONB,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  v_item JSONB;
  v_product RECORD;
  v_tablets_needed INTEGER;
  v_subtotal NUMERIC(12, 2) := 0;
  v_tax NUMERIC(12, 2) := 0;
  v_item_count INTEGER := 0;
  v_unit_count INTEGER := 0;
  v_line_subtotal NUMERIC(12, 2);
  v_line_tax NUMERIC(12, 2);
BEGIN
  IF p_items IS NULL OR JSONB_ARRAY_LENGTH(p_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  -- Validate stock before writing anything
  FOR v_item IN SELECT * FROM JSONB_ARRAY_ELEMENTS(p_items)
  LOOP
    SELECT *
    INTO v_product
    FROM public.products
    WHERE id = (v_item->>'productId')::UUID
      AND store_id = p_store_id
      AND status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found or inactive: %', v_item->>'productId';
    END IF;

    v_tablets_needed := (v_item->>'quantity')::INTEGER * (v_item->>'tabletsPerUnit')::INTEGER;

    IF v_product.stock_quantity < v_tablets_needed THEN
      RAISE EXCEPTION 'Insufficient stock for "%". Available: %, requested: %',
        v_product.product_name, v_product.stock_quantity, v_tablets_needed;
    END IF;
  END LOOP;

  v_order_number := public.generate_order_number(p_store_id);

  -- Compute totals
  FOR v_item IN SELECT * FROM JSONB_ARRAY_ELEMENTS(p_items)
  LOOP
    v_line_subtotal := (v_item->>'unitPrice')::NUMERIC * (v_item->>'quantity')::INTEGER;
    v_line_tax := (v_item->>'unitTax')::NUMERIC * (v_item->>'quantity')::INTEGER;
    v_subtotal := v_subtotal + v_line_subtotal;
    v_tax := v_tax + v_line_tax;
    v_item_count := v_item_count + 1;
    v_unit_count := v_unit_count + (v_item->>'quantity')::INTEGER;
  END LOOP;

  INSERT INTO public.orders (
    store_id,
    order_number,
    order_type,
    status,
    sold_by,
    subtotal,
    tax_amount,
    total_amount,
    item_count,
    unit_count,
    notes
  ) VALUES (
    p_store_id,
    v_order_number,
    'pos',
    'completed',
    p_sold_by,
    v_subtotal,
    v_tax,
    v_subtotal + v_tax,
    v_item_count,
    v_unit_count,
    p_notes
  )
  RETURNING id INTO v_order_id;

  -- Insert line items + deduct inventory
  FOR v_item IN SELECT * FROM JSONB_ARRAY_ELEMENTS(p_items)
  LOOP
    SELECT *
    INTO v_product
    FROM public.products
    WHERE id = (v_item->>'productId')::UUID
      AND store_id = p_store_id
    FOR UPDATE;

    v_tablets_needed := (v_item->>'quantity')::INTEGER * (v_item->>'tabletsPerUnit')::INTEGER;
    v_line_subtotal := (v_item->>'unitPrice')::NUMERIC * (v_item->>'quantity')::INTEGER;
    v_line_tax := (v_item->>'unitTax')::NUMERIC * (v_item->>'quantity')::INTEGER;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      generic_name,
      brand_name,
      sale_unit,
      quantity,
      unit_price,
      unit_tax,
      line_subtotal,
      line_tax,
      line_total,
      tablets_per_unit,
      tablets_deducted,
      batch_number,
      expiry_date
    ) VALUES (
      v_order_id,
      v_product.id,
      v_product.product_name,
      v_product.generic_name,
      v_product.brand_name,
      (v_item->>'saleUnit')::public.order_sale_unit,
      (v_item->>'quantity')::INTEGER,
      (v_item->>'unitPrice')::NUMERIC,
      COALESCE((v_item->>'unitTax')::NUMERIC, 0),
      v_line_subtotal,
      v_line_tax,
      v_line_subtotal + v_line_tax,
      (v_item->>'tabletsPerUnit')::INTEGER,
      v_tablets_needed,
      v_product.batch_number,
      v_product.expiry_date
    );

    UPDATE public.products
    SET stock_quantity = stock_quantity - v_tablets_needed
    WHERE id = v_product.id;
  END LOOP;

  RETURN v_order_id;
END;
$$;

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on orders" ON public.orders;
CREATE POLICY "Service role full access on orders"
  ON public.orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Store staff can read own store orders" ON public.orders;
CREATE POLICY "Store staff can read own store orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    store_id IN (
      SELECT store_id FROM public.profiles
      WHERE id = auth.uid() AND store_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Service role full access on order_items" ON public.order_items;
CREATE POLICY "Service role full access on order_items"
  ON public.order_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Store staff can read own store order items" ON public.order_items;
CREATE POLICY "Store staff can read own store order items"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM public.orders
      WHERE store_id IN (
        SELECT store_id FROM public.profiles
        WHERE id = auth.uid() AND store_id IS NOT NULL
      )
    )
  );

-- ------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS orders_store_id_idx ON public.orders (store_id);
CREATE INDEX IF NOT EXISTS orders_sold_by_idx ON public.orders (sold_by);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_store_created_idx ON public.orders (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON public.order_items (product_id);
CREATE INDEX IF NOT EXISTS orders_delivery_staff_id_idx ON public.orders (delivery_staff_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders (status);
CREATE INDEX IF NOT EXISTS orders_order_type_idx ON public.orders (order_type);

-- Migration for existing databases
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_staff_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ============================================================
-- MediOS Phase 3 — Branch-scoped products, POS, stock requests
-- Run in Supabase SQL Editor after phase1_branches.sql
-- Safe to re-run
-- ============================================================

-- ------------------------------------------------------------
-- 1) Backfill: move store-level products to first active branch
--    (only when store has branches but product has no branch_id)
-- ------------------------------------------------------------
UPDATE public.products p
SET branch_id = b.id
FROM (
  SELECT DISTINCT ON (store_id) id, store_id
  FROM public.branches
  WHERE status = 'active'
  ORDER BY store_id, created_at ASC
) b
WHERE p.store_id = b.store_id
  AND p.branch_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.branches br
    WHERE br.store_id = p.store_id AND br.status = 'active'
  );

-- ------------------------------------------------------------
-- 2) POS checkout — branch-aware stock + order.branch_id
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_pos_order(
  p_store_id UUID,
  p_sold_by UUID,
  p_items JSONB,
  p_notes TEXT DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL
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

  IF p_branch_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.branches
      WHERE id = p_branch_id
        AND store_id = p_store_id
        AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'Invalid branch for this store';
    END IF;
  END IF;

  FOR v_item IN SELECT * FROM JSONB_ARRAY_ELEMENTS(p_items)
  LOOP
    SELECT *
    INTO v_product
    FROM public.products
    WHERE id = (v_item->>'productId')::UUID
      AND store_id = p_store_id
      AND status = 'active'
      AND (
        (p_branch_id IS NULL AND branch_id IS NULL)
        OR branch_id = p_branch_id
      )
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
    branch_id,
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
    p_branch_id,
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

  FOR v_item IN SELECT * FROM JSONB_ARRAY_ELEMENTS(p_items)
  LOOP
    SELECT *
    INTO v_product
    FROM public.products
    WHERE id = (v_item->>'productId')::UUID
      AND store_id = p_store_id
      AND (
        (p_branch_id IS NULL AND branch_id IS NULL)
        OR branch_id = p_branch_id
      )
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

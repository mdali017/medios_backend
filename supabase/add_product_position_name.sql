-- Add position_name column for store-specific medicine shelf/rack location
-- Run in Supabase SQL Editor on existing databases

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS position_name TEXT;

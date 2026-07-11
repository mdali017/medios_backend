-- ============================================================
-- MediOS — Per-user Google Sheets OAuth tokens
-- Run in Supabase SQL Editor after schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.google_sheet_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  google_email TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expiry TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.google_sheet_integrations_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS google_sheet_integrations_set_updated_at ON public.google_sheet_integrations;
CREATE TRIGGER google_sheet_integrations_set_updated_at
  BEFORE UPDATE ON public.google_sheet_integrations
  FOR EACH ROW EXECUTE FUNCTION public.google_sheet_integrations_set_updated_at();

ALTER TABLE public.google_sheet_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on google_sheet_integrations" ON public.google_sheet_integrations;
CREATE POLICY "Service role full access on google_sheet_integrations"
  ON public.google_sheet_integrations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS google_sheet_integrations_user_id_idx
  ON public.google_sheet_integrations (user_id);

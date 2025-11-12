ALTER TABLE IF EXISTS public.audits
  ADD COLUMN IF NOT EXISTS override_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS override_notes jsonb NOT NULL DEFAULT '{}'::jsonb;;

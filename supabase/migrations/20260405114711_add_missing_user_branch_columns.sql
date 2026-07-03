-- Add missing columns to public.users
-- (Recovered from live supabase_migrations.schema_migrations — applied 2026-04-05.)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- Add missing is_active column to branches
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- ============================================================================
-- Fix handle_new_user trigger
-- 1. Set auth_user_id = NEW.id so the auth ↔ public.users link is explicit
-- 2. Accept both 'name' and 'full_name' from raw_user_meta_data (Edge Function
--    sends 'name'; direct sign-up flows may send 'full_name')
-- 3. Default role to AUDITOR instead of ADMIN (least-privilege default)
-- 4. Add ON CONFLICT (id) DO NOTHING to prevent duplicate-key errors if any
--    caller also inserts directly (defence in depth)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    auth_user_id,
    email,
    full_name,
    role,
    org_id,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(NEW.raw_user_meta_data->>'role', 'AUDITOR'),
    (NEW.raw_user_meta_data->>'org_id')::UUID,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is attached (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

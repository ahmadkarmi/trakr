-- ============================================================================
-- Sync Existing Auth Users Migration
-- Created: 2025-01-08
-- Purpose: Sync users from auth.users to public.users (one-time fix)
-- ============================================================================

-- Insert any auth.users that don't exist in public.users
INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  org_id,
  is_active,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  COALESCE(au.raw_user_meta_data->>'role', 'ADMIN'),
  (au.raw_user_meta_data->>'org_id')::UUID,
  true,
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
  AND au.email IS NOT NULL;

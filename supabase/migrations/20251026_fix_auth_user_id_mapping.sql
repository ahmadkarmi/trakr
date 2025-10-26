-- Fix auth_user_id mapping for production users
-- This migration ensures public.users.auth_user_id matches auth.users.id

-- Step 1: Check current state (query this first to see the issue)
-- SELECT u.id, u.email, u.auth_user_id, a.id as auth_id
-- FROM public.users u
-- LEFT JOIN auth.users a ON a.email = u.email
-- WHERE u.email = 'admin@trakr.com';

-- Step 2: Update auth_user_id to match auth.users.id based on email
UPDATE public.users u
SET auth_user_id = a.id
FROM auth.users a
WHERE a.email = u.email
  AND (u.auth_user_id IS NULL OR u.auth_user_id != a.id);

-- Step 3: Verify the fix
-- SELECT u.id, u.email, u.auth_user_id, a.id as auth_id
-- FROM public.users u
-- JOIN auth.users a ON a.email = u.email
-- WHERE u.email = 'admin@trakr.com';

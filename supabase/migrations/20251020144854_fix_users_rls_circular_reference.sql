-- Create helper function to get current user's org_id (bypasses RLS)
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT org_id 
  FROM public.users 
  WHERE id = auth.uid() OR auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Create helper function to check if current user is super admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_current_user_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE (id = auth.uid() OR auth_user_id = auth.uid())
      AND role = 'SUPER_ADMIN'
  );
$$;

-- Now recreate the users SELECT policy without circular reference
DROP POLICY IF EXISTS users_select_policy ON public.users;

CREATE POLICY users_select_policy
ON public.users 
FOR SELECT 
TO authenticated
USING (
  -- User can see their own profile (direct check, no subquery)
  id = auth.uid() 
  OR auth_user_id = auth.uid()
  -- OR users in same org (using helper function that bypasses RLS)
  OR (current_user_org_id() IS NOT NULL AND org_id = current_user_org_id())
  -- OR user is SUPER_ADMIN (using helper function)
  OR is_current_user_super_admin()
);;

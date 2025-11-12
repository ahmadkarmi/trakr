-- ================================================
-- COMPREHENSIVE RLS REFACTOR - PART 2: CORE TABLES
-- ================================================
-- Organizations, Users, Branches
-- ================================================

-- ================================================
-- ORGANIZATIONS TABLE
-- ================================================

-- Drop existing policies
DROP POLICY IF EXISTS organizations_select_policy ON public.organizations;
DROP POLICY IF EXISTS organizations_insert_policy ON public.organizations;
DROP POLICY IF EXISTS organizations_update_policy ON public.organizations;
DROP POLICY IF EXISTS organizations_delete_policy ON public.organizations;

-- SELECT: Super admins see all, others see only their org
CREATE POLICY organizations_select_policy
ON public.organizations
FOR SELECT
TO authenticated
USING (
  is_super_admin()
  OR id = current_user_org_id()
);

-- INSERT: Only super admins can create organizations
CREATE POLICY organizations_insert_policy
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (is_super_admin());

-- UPDATE: Super admins can update all, admins can update their own org
CREATE POLICY organizations_update_policy
ON public.organizations
FOR UPDATE
TO authenticated
USING (
  is_super_admin()
  OR (is_admin_or_super() AND id = current_user_org_id())
)
WITH CHECK (
  is_super_admin()
  OR (is_admin_or_super() AND id = current_user_org_id())
);

-- DELETE: Only super admins can delete organizations
CREATE POLICY organizations_delete_policy
ON public.organizations
FOR DELETE
TO authenticated
USING (is_super_admin());

-- ================================================
-- USERS TABLE
-- ================================================

-- Drop existing policies
DROP POLICY IF EXISTS users_select_policy ON public.users;
DROP POLICY IF EXISTS users_insert_policy ON public.users;
DROP POLICY IF EXISTS users_update_policy ON public.users;
DROP POLICY IF EXISTS users_delete_policy ON public.users;

-- SELECT: Super admins see all, others see users in their org
CREATE POLICY users_select_policy
ON public.users
FOR SELECT
TO authenticated
USING (
  -- Current user can always see themselves
  id = auth.uid() 
  OR auth_user_id = auth.uid()
  -- Super admins see all users
  OR is_super_admin()
  -- Others see users in same org
  OR (current_user_org_id() IS NOT NULL AND org_id = current_user_org_id())
);

-- INSERT: Super admins can insert anywhere, admins in their org
CREATE POLICY users_insert_policy
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin()
  OR (is_admin_or_super() AND org_id = current_user_org_id())
);

-- UPDATE: Super admins can update all, admins update org users, users update self
CREATE POLICY users_update_policy
ON public.users
FOR UPDATE
TO authenticated
USING (
  id = current_user_id()
  OR is_super_admin()
  OR (is_admin_or_super() AND org_id = current_user_org_id())
)
WITH CHECK (
  id = current_user_id()
  OR is_super_admin()
  OR (is_admin_or_super() AND org_id = current_user_org_id())
);

-- DELETE: Super admins can delete all, admins can delete org users (not themselves)
CREATE POLICY users_delete_policy
ON public.users
FOR DELETE
TO authenticated
USING (
  is_super_admin()
  OR (is_admin_or_super() AND org_id = current_user_org_id() AND id != current_user_id())
);

-- ================================================
-- BRANCHES TABLE
-- ================================================

-- Drop existing policies
DROP POLICY IF EXISTS branches_select_policy ON public.branches;
DROP POLICY IF EXISTS branches_insert_policy ON public.branches;
DROP POLICY IF EXISTS branches_update_policy ON public.branches;
DROP POLICY IF EXISTS branches_delete_policy ON public.branches;

-- SELECT: Super admins see all, admins/managers see org branches, auditors see assigned branches
CREATE POLICY branches_select_policy
ON public.branches
FOR SELECT
TO authenticated
USING (
  is_super_admin()
  OR (
    org_id = current_user_org_id()
    AND (
      -- Admins and managers see all branches in their org
      current_user_role() IN ('ADMIN', 'BRANCH_MANAGER')
      -- Auditors see only assigned branches
      OR (current_user_role() = 'AUDITOR' AND id = ANY(user_assigned_branch_ids()))
    )
  )
);

-- INSERT: Super admins and admins can create branches in their org
CREATE POLICY branches_insert_policy
ON public.branches
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin()
  OR (is_admin_or_super() AND org_id = current_user_org_id())
);

-- UPDATE: Super admins can update all, admins update org branches, managers update assigned branches
CREATE POLICY branches_update_policy
ON public.branches
FOR UPDATE
TO authenticated
USING (
  is_super_admin()
  OR (is_admin_or_super() AND org_id = current_user_org_id())
  OR (current_user_role() = 'BRANCH_MANAGER' AND org_id = current_user_org_id() AND id = ANY(user_managed_branch_ids()))
)
WITH CHECK (
  is_super_admin()
  OR (is_admin_or_super() AND org_id = current_user_org_id())
  OR (current_user_role() = 'BRANCH_MANAGER' AND org_id = current_user_org_id() AND id = ANY(user_managed_branch_ids()))
);

-- DELETE: Only super admins and admins can delete branches
CREATE POLICY branches_delete_policy
ON public.branches
FOR DELETE
TO authenticated
USING (
  is_super_admin()
  OR (is_admin_or_super() AND org_id = current_user_org_id())
);
;

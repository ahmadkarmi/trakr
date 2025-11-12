-- ================================================
-- COMPREHENSIVE RLS REFACTOR - PART 1: HELPER FUNCTIONS
-- ================================================
-- This migration creates security definer helper functions
-- to avoid circular references in RLS policies
-- ================================================

-- Drop existing helper functions if they exist
DROP FUNCTION IF EXISTS public.current_user_id() CASCADE;
DROP FUNCTION IF EXISTS public.current_user_org_id() CASCADE;
DROP FUNCTION IF EXISTS public.current_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin_or_super() CASCADE;
DROP FUNCTION IF EXISTS public.is_current_user_super_admin() CASCADE;
DROP FUNCTION IF EXISTS public.can_manage_auditor_assignment(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_assigned_branch_ids() CASCADE;
DROP FUNCTION IF EXISTS public.user_managed_branch_ids() CASCADE;

-- ================================================
-- CORE USER CONTEXT FUNCTIONS
-- ================================================

-- Returns the public.users.id for the currently authenticated user
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id 
  FROM public.users 
  WHERE auth_user_id = auth.uid() OR id = auth.uid()
  LIMIT 1;
$$;

-- Returns the org_id for the currently authenticated user
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT org_id 
  FROM public.users 
  WHERE auth_user_id = auth.uid() OR id = auth.uid()
  LIMIT 1;
$$;

-- Returns the role for the currently authenticated user
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role 
  FROM public.users 
  WHERE auth_user_id = auth.uid() OR id = auth.uid()
  LIMIT 1;
$$;

-- ================================================
-- ROLE CHECK FUNCTIONS
-- ================================================

-- Check if current user is SUPER_ADMIN
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE (auth_user_id = auth.uid() OR id = auth.uid())
      AND role = 'SUPER_ADMIN'
  );
$$;

-- Check if current user is ADMIN or SUPER_ADMIN
CREATE OR REPLACE FUNCTION public.is_admin_or_super()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE (auth_user_id = auth.uid() OR id = auth.uid())
      AND role IN ('ADMIN', 'SUPER_ADMIN')
  );
$$;

-- Alias for compatibility
CREATE OR REPLACE FUNCTION public.is_current_user_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT public.is_super_admin();
$$;

-- ================================================
-- ASSIGNMENT & ACCESS FUNCTIONS
-- ================================================

-- Returns array of branch IDs assigned to current user (for auditors)
CREATE OR REPLACE FUNCTION public.user_assigned_branch_ids()
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(branch_ids, ARRAY[]::uuid[])
  FROM public.auditor_assignments
  WHERE user_id = public.current_user_id()
  LIMIT 1;
$$;

-- Returns array of branch IDs managed by current user (for branch managers)
CREATE OR REPLACE FUNCTION public.user_managed_branch_ids()
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT ARRAY_AGG(DISTINCT branch_id)
  FROM public.branch_manager_assignments
  WHERE manager_id = public.current_user_id();
$$;

-- Check if user can manage auditor assignment for a target user
CREATE OR REPLACE FUNCTION public.can_manage_auditor_assignment(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users requesting_user
    LEFT JOIN public.users target_user ON target_user.id = target_user_id
    WHERE (requesting_user.id = auth.uid() OR requesting_user.auth_user_id = auth.uid())
      AND (
        requesting_user.role = 'SUPER_ADMIN'
        OR (
          requesting_user.role IN ('ADMIN', 'BRANCH_MANAGER')
          AND requesting_user.org_id = target_user.org_id
        )
      )
  );
$$;

-- ================================================
-- INDEXES FOR PERFORMANCE
-- ================================================

-- Ensure auth_user_id is indexed for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_org_role ON public.users(org_id, role);
CREATE INDEX IF NOT EXISTS idx_auditor_assignments_user_id ON public.auditor_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_branch_manager_assignments_manager_id ON public.branch_manager_assignments(manager_id);

COMMENT ON FUNCTION public.current_user_id() IS 'Returns public.users.id for authenticated user - SECURITY DEFINER to bypass RLS';
COMMENT ON FUNCTION public.current_user_org_id() IS 'Returns org_id for authenticated user - SECURITY DEFINER to bypass RLS';
COMMENT ON FUNCTION public.current_user_role() IS 'Returns role for authenticated user - SECURITY DEFINER to bypass RLS';
COMMENT ON FUNCTION public.is_super_admin() IS 'Returns true if current user is SUPER_ADMIN';
COMMENT ON FUNCTION public.is_admin_or_super() IS 'Returns true if current user is ADMIN or SUPER_ADMIN';
;

-- Fix auditor_assignments RLS policies to avoid circular references
-- Drop existing policies
DROP POLICY IF EXISTS auditor_assignments_select_policy ON public.auditor_assignments;
DROP POLICY IF EXISTS auditor_assignments_insert_policy ON public.auditor_assignments;
DROP POLICY IF EXISTS auditor_assignments_update_policy ON public.auditor_assignments;
DROP POLICY IF EXISTS auditor_assignments_delete_policy ON public.auditor_assignments;

-- Helper function to check if user can manage assignments for a given user_id
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

-- SELECT: Super admin, admin/BM in same org, or viewing own assignment
CREATE POLICY auditor_assignments_select_policy
ON public.auditor_assignments
FOR SELECT
TO authenticated
USING (
  is_current_user_super_admin()
  OR can_manage_auditor_assignment(user_id)
  OR user_id = auth.uid()
  OR user_id IN (
    SELECT id FROM public.users 
    WHERE auth_user_id = auth.uid()
  )
);

-- INSERT: Super admin or admin/BM in same org as target user
CREATE POLICY auditor_assignments_insert_policy
ON public.auditor_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  is_current_user_super_admin()
  OR can_manage_auditor_assignment(user_id)
);

-- UPDATE: Same as insert
CREATE POLICY auditor_assignments_update_policy
ON public.auditor_assignments
FOR UPDATE
TO authenticated
USING (
  is_current_user_super_admin()
  OR can_manage_auditor_assignment(user_id)
)
WITH CHECK (
  is_current_user_super_admin()
  OR can_manage_auditor_assignment(user_id)
);

-- DELETE: Same as insert
CREATE POLICY auditor_assignments_delete_policy
ON public.auditor_assignments
FOR DELETE
TO authenticated
USING (
  is_current_user_super_admin()
  OR can_manage_auditor_assignment(user_id)
);;

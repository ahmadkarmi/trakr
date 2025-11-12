-- ================================================
-- COMPREHENSIVE RLS REFACTOR - PART 5: ASSIGNMENTS & ZONES
-- ================================================

-- ================================================
-- AUDITOR_ASSIGNMENTS TABLE
-- ================================================

-- Drop existing policies
DROP POLICY IF EXISTS auditor_assignments_select_policy ON public.auditor_assignments;
DROP POLICY IF EXISTS auditor_assignments_insert_policy ON public.auditor_assignments;
DROP POLICY IF EXISTS auditor_assignments_update_policy ON public.auditor_assignments;
DROP POLICY IF EXISTS auditor_assignments_delete_policy ON public.auditor_assignments;

-- SELECT: Super admins see all, admins/managers see org assignments, auditors see own
CREATE POLICY auditor_assignments_select_policy
ON public.auditor_assignments
FOR SELECT
TO authenticated
USING (
  is_super_admin()
  OR (
    org_id = current_user_org_id()
    AND (
      current_user_role() IN ('ADMIN', 'BRANCH_MANAGER')
      OR user_id = current_user_id()
    )
  )
);

-- INSERT: Only super admins and admins can create assignments
CREATE POLICY auditor_assignments_insert_policy
ON public.auditor_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin()
  OR (is_admin_or_super() AND org_id = current_user_org_id())
);

-- UPDATE: Super admins and admins can update assignments
CREATE POLICY auditor_assignments_update_policy
ON public.auditor_assignments
FOR UPDATE
TO authenticated
USING (
  is_super_admin()
  OR (is_admin_or_super() AND org_id = current_user_org_id())
)
WITH CHECK (
  is_super_admin()
  OR (is_admin_or_super() AND org_id = current_user_org_id())
);

-- DELETE: Super admins and admins can delete assignments
CREATE POLICY auditor_assignments_delete_policy
ON public.auditor_assignments
FOR DELETE
TO authenticated
USING (
  is_super_admin()
  OR (is_admin_or_super() AND org_id = current_user_org_id())
);

-- ================================================
-- BRANCH_MANAGER_ASSIGNMENTS TABLE
-- ================================================

-- Drop existing policies
DROP POLICY IF EXISTS branch_manager_assignments_select_policy ON public.branch_manager_assignments;
DROP POLICY IF EXISTS branch_manager_assignments_insert_policy ON public.branch_manager_assignments;
DROP POLICY IF EXISTS branch_manager_assignments_update_policy ON public.branch_manager_assignments;
DROP POLICY IF EXISTS branch_manager_assignments_delete_policy ON public.branch_manager_assignments;

-- SELECT: Can see assignments if can see the branch
CREATE POLICY branch_manager_assignments_select_policy
ON public.branch_manager_assignments
FOR SELECT
TO authenticated
USING (
  is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.branches b
    WHERE b.id = branch_manager_assignments.branch_id
      AND (
        is_super_admin()
        OR b.org_id = current_user_org_id()
      )
  )
);

-- INSERT: Only super admins and admins can create manager assignments
CREATE POLICY branch_manager_assignments_insert_policy
ON public.branch_manager_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin()
  OR (
    is_admin_or_super()
    AND EXISTS (
      SELECT 1 FROM public.branches b
      WHERE b.id = branch_manager_assignments.branch_id
        AND b.org_id = current_user_org_id()
    )
  )
);

-- UPDATE: Only super admins and admins can update manager assignments
CREATE POLICY branch_manager_assignments_update_policy
ON public.branch_manager_assignments
FOR UPDATE
TO authenticated
USING (
  is_super_admin()
  OR (
    is_admin_or_super()
    AND EXISTS (
      SELECT 1 FROM public.branches b
      WHERE b.id = branch_manager_assignments.branch_id
        AND b.org_id = current_user_org_id()
    )
  )
)
WITH CHECK (
  is_super_admin()
  OR (
    is_admin_or_super()
    AND EXISTS (
      SELECT 1 FROM public.branches b
      WHERE b.id = branch_manager_assignments.branch_id
        AND b.org_id = current_user_org_id()
    )
  )
);

-- DELETE: Only super admins and admins can delete manager assignments
CREATE POLICY branch_manager_assignments_delete_policy
ON public.branch_manager_assignments
FOR DELETE
TO authenticated
USING (
  is_super_admin()
  OR (
    is_admin_or_super()
    AND EXISTS (
      SELECT 1 FROM public.branches b
      WHERE b.id = branch_manager_assignments.branch_id
        AND b.org_id = current_user_org_id()
    )
  )
);

-- ================================================
-- ZONES TABLE
-- ================================================

-- Drop existing policies
DROP POLICY IF EXISTS zones_select_policy ON public.zones;
DROP POLICY IF EXISTS zones_insert_policy ON public.zones;
DROP POLICY IF EXISTS zones_update_policy ON public.zones;
DROP POLICY IF EXISTS zones_delete_policy ON public.zones;

-- SELECT: Super admins see all, others see zones in their org
CREATE POLICY zones_select_policy
ON public.zones
FOR SELECT
TO authenticated
USING (
  is_super_admin()
  OR org_id = current_user_org_id()
);

-- INSERT: Only super admins and admins can create zones
CREATE POLICY zones_insert_policy
ON public.zones
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin()
  OR (is_admin_or_super() AND org_id = current_user_org_id())
);

-- UPDATE: Only super admins and admins can update zones
CREATE POLICY zones_update_policy
ON public.zones
FOR UPDATE
TO authenticated
USING (
  is_super_admin()
  OR (is_admin_or_super() AND org_id = current_user_org_id())
)
WITH CHECK (
  is_super_admin()
  OR (is_admin_or_super() AND org_id = current_user_org_id())
);

-- DELETE: Only super admins and admins can delete zones
CREATE POLICY zones_delete_policy
ON public.zones
FOR DELETE
TO authenticated
USING (
  is_super_admin()
  OR (is_admin_or_super() AND org_id = current_user_org_id())
);

-- ================================================
-- ZONE_BRANCHES TABLE (junction table)
-- ================================================

-- Drop existing policies
DROP POLICY IF EXISTS zone_branches_select_policy ON public.zone_branches;
DROP POLICY IF EXISTS zone_branches_insert_policy ON public.zone_branches;
DROP POLICY IF EXISTS zone_branches_update_policy ON public.zone_branches;
DROP POLICY IF EXISTS zone_branches_delete_policy ON public.zone_branches;

-- SELECT: Can see zone_branches if can see the zone
CREATE POLICY zone_branches_select_policy
ON public.zone_branches
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zones z
    WHERE z.id = zone_branches.zone_id
      AND (is_super_admin() OR z.org_id = current_user_org_id())
  )
);

-- INSERT: Only admins can manage zone-branch relationships
CREATE POLICY zone_branches_insert_policy
ON public.zone_branches
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin()
  OR (
    is_admin_or_super()
    AND EXISTS (
      SELECT 1 FROM public.zones z
      WHERE z.id = zone_branches.zone_id
        AND z.org_id = current_user_org_id()
    )
  )
);

-- UPDATE: Only admins can manage zone-branch relationships
CREATE POLICY zone_branches_update_policy
ON public.zone_branches
FOR UPDATE
TO authenticated
USING (
  is_super_admin()
  OR (
    is_admin_or_super()
    AND EXISTS (
      SELECT 1 FROM public.zones z
      WHERE z.id = zone_branches.zone_id
        AND z.org_id = current_user_org_id()
    )
  )
)
WITH CHECK (
  is_super_admin()
  OR (
    is_admin_or_super()
    AND EXISTS (
      SELECT 1 FROM public.zones z
      WHERE z.id = zone_branches.zone_id
        AND z.org_id = current_user_org_id()
    )
  )
);

-- DELETE: Only admins can manage zone-branch relationships
CREATE POLICY zone_branches_delete_policy
ON public.zone_branches
FOR DELETE
TO authenticated
USING (
  is_super_admin()
  OR (
    is_admin_or_super()
    AND EXISTS (
      SELECT 1 FROM public.zones z
      WHERE z.id = zone_branches.zone_id
        AND z.org_id = current_user_org_id()
    )
  )
);
;

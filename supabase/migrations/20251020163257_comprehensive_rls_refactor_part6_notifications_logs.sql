-- ================================================
-- COMPREHENSIVE RLS REFACTOR - PART 6: NOTIFICATIONS & LOGS
-- ================================================

-- ================================================
-- NOTIFICATIONS TABLE
-- ================================================

-- Drop existing policies
DROP POLICY IF EXISTS notifications_select_policy ON public.notifications;
DROP POLICY IF EXISTS notifications_insert_policy ON public.notifications;
DROP POLICY IF EXISTS notifications_update_policy ON public.notifications;
DROP POLICY IF EXISTS notifications_delete_policy ON public.notifications;

-- SELECT: Super admins see all, users see only their own notifications
CREATE POLICY notifications_select_policy
ON public.notifications
FOR SELECT
TO authenticated
USING (
  is_super_admin()
  OR user_id = current_user_id()
);

-- INSERT: Only super admins and system (via service role) can create notifications
-- Regular users cannot create notifications - they're system-generated
CREATE POLICY notifications_insert_policy
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (is_super_admin());

-- UPDATE: Super admins and notification owners can update (e.g., mark as read)
CREATE POLICY notifications_update_policy
ON public.notifications
FOR UPDATE
TO authenticated
USING (
  is_super_admin()
  OR user_id = current_user_id()
)
WITH CHECK (
  is_super_admin()
  OR user_id = current_user_id()
);

-- DELETE: Super admins and notification owners can delete
CREATE POLICY notifications_delete_policy
ON public.notifications
FOR DELETE
TO authenticated
USING (
  is_super_admin()
  OR user_id = current_user_id()
);

-- ================================================
-- ACTIVITY_LOGS TABLE
-- ================================================

-- Drop existing policies
DROP POLICY IF EXISTS activity_logs_select_policy ON public.activity_logs;
DROP POLICY IF EXISTS activity_logs_insert_policy ON public.activity_logs;
DROP POLICY IF EXISTS activity_logs_update_policy ON public.activity_logs;
DROP POLICY IF EXISTS activity_logs_delete_policy ON public.activity_logs;

-- SELECT: Super admins see all, admins see org logs, others see own logs
CREATE POLICY activity_logs_select_policy
ON public.activity_logs
FOR SELECT
TO authenticated
USING (
  is_super_admin()
  OR (is_admin_or_super() AND org_id = current_user_org_id())
  OR user_id = current_user_id()
);

-- INSERT: Anyone can create activity logs (system tracking)
CREATE POLICY activity_logs_insert_policy
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin()
  OR org_id = current_user_org_id()
);

-- UPDATE: Only super admins can update activity logs (immutable by design)
CREATE POLICY activity_logs_update_policy
ON public.activity_logs
FOR UPDATE
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- DELETE: Only super admins can delete activity logs
CREATE POLICY activity_logs_delete_policy
ON public.activity_logs
FOR DELETE
TO authenticated
USING (is_super_admin());

-- ================================================
-- USER_INVITATIONS TABLE
-- ================================================

-- Drop existing policies
DROP POLICY IF EXISTS user_invitations_select_policy ON public.user_invitations;
DROP POLICY IF EXISTS user_invitations_insert_policy ON public.user_invitations;
DROP POLICY IF EXISTS user_invitations_update_policy ON public.user_invitations;
DROP POLICY IF EXISTS user_invitations_delete_policy ON public.user_invitations;

-- SELECT: Super admins see all, admins see org invitations
CREATE POLICY user_invitations_select_policy
ON public.user_invitations
FOR SELECT
TO authenticated
USING (
  is_super_admin()
  OR (is_admin_or_super() AND org_id = current_user_org_id())
);

-- INSERT: Only super admins and admins can create invitations
CREATE POLICY user_invitations_insert_policy
ON public.user_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin()
  OR (is_admin_or_super() AND org_id = current_user_org_id())
);

-- UPDATE: Super admins and admins can update invitations (e.g., mark as accepted)
CREATE POLICY user_invitations_update_policy
ON public.user_invitations
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

-- DELETE: Only super admins and admins can delete invitations
CREATE POLICY user_invitations_delete_policy
ON public.user_invitations
FOR DELETE
TO authenticated
USING (
  is_super_admin()
  OR (is_admin_or_super() AND org_id = current_user_org_id())
);

-- ================================================
-- ADDITIONAL TABLES (if they exist and don't have policies)
-- ================================================

-- AUDITOR_BRANCH_ASSIGNMENTS (if exists - alternative to auditor_assignments)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'auditor_branch_assignments') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS auditor_branch_assignments_select_policy ON public.auditor_branch_assignments;
    DROP POLICY IF EXISTS auditor_branch_assignments_insert_policy ON public.auditor_branch_assignments;
    DROP POLICY IF EXISTS auditor_branch_assignments_update_policy ON public.auditor_branch_assignments;
    DROP POLICY IF EXISTS auditor_branch_assignments_delete_policy ON public.auditor_branch_assignments;
    
    -- SELECT: Same as auditor_assignments
    CREATE POLICY auditor_branch_assignments_select_policy
    ON public.auditor_branch_assignments
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
    
    -- INSERT: Only super admins and admins
    CREATE POLICY auditor_branch_assignments_insert_policy
    ON public.auditor_branch_assignments
    FOR INSERT
    TO authenticated
    WITH CHECK (
      is_super_admin()
      OR (is_admin_or_super() AND org_id = current_user_org_id())
    );
    
    -- UPDATE: Only super admins and admins
    CREATE POLICY auditor_branch_assignments_update_policy
    ON public.auditor_branch_assignments
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
    
    -- DELETE: Only super admins and admins
    CREATE POLICY auditor_branch_assignments_delete_policy
    ON public.auditor_branch_assignments
    FOR DELETE
    TO authenticated
    USING (
      is_super_admin()
      OR (is_admin_or_super() AND org_id = current_user_org_id())
    );
  END IF;
END $$;

-- ZONE_ASSIGNMENTS (if exists - alternative to auditor_assignments for zones)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'zone_assignments') THEN
    DROP POLICY IF EXISTS zone_assignments_select_policy ON public.zone_assignments;
    DROP POLICY IF EXISTS zone_assignments_insert_policy ON public.zone_assignments;
    DROP POLICY IF EXISTS zone_assignments_update_policy ON public.zone_assignments;
    DROP POLICY IF EXISTS zone_assignments_delete_policy ON public.zone_assignments;
    
    CREATE POLICY zone_assignments_select_policy
    ON public.zone_assignments FOR SELECT TO authenticated
    USING (is_super_admin() OR (org_id = current_user_org_id() AND (current_user_role() IN ('ADMIN', 'BRANCH_MANAGER') OR user_id = current_user_id())));
    
    CREATE POLICY zone_assignments_insert_policy
    ON public.zone_assignments FOR INSERT TO authenticated
    WITH CHECK (is_super_admin() OR (is_admin_or_super() AND org_id = current_user_org_id()));
    
    CREATE POLICY zone_assignments_update_policy
    ON public.zone_assignments FOR UPDATE TO authenticated
    USING (is_super_admin() OR (is_admin_or_super() AND org_id = current_user_org_id()))
    WITH CHECK (is_super_admin() OR (is_admin_or_super() AND org_id = current_user_org_id()));
    
    CREATE POLICY zone_assignments_delete_policy
    ON public.zone_assignments FOR DELETE TO authenticated
    USING (is_super_admin() OR (is_admin_or_super() AND org_id = current_user_org_id()));
  END IF;
END $$;
;

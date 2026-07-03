-- ============================================================================
-- Production RLS cleanup
-- 1. branch_manager_assignments: two legacy always-true policies coexist with
--    the org-scoped *_policy generation; permissive policies OR together, so
--    the legacy ones bypass RLS entirely for any authenticated user.
-- 2. notifications: legacy INSERT was WITH CHECK (true) (cross-org spam);
--    the *_policy INSERT was super-admin-only (breaks app notifications).
--    Replace with same-org sender→recipient. Also drop the auth.uid()=user_id
--    generation (user_id is public.users.id, not the auth uid) and the
--    duplicate owner_only update policy.
-- 3. handle_new_user: pin search_path (advisor 0011_function_search_path_mutable).
-- 4. Revoke anon EXECUTE on RPCs. Predicate helpers (is_*, current_*, ...)
--    stay anon-executable: policies on tables with public read paths
--    (e.g. app_config) evaluate them in anon contexts.
-- 5. Backfill users.auth_user_id where an auth user with the same email
--    exists (3 rows: legacy seeded users predating the linkage column).
-- ============================================================================

-- 1. branch_manager_assignments
DROP POLICY IF EXISTS "Anyone authenticated can manage branch manager assignments" ON public.branch_manager_assignments;
DROP POLICY IF EXISTS "Anyone authenticated can view branch manager assignments" ON public.branch_manager_assignments;

-- 2. notifications
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS notifications_update_owner_only ON public.notifications;
DROP POLICY IF EXISTS notifications_insert_policy ON public.notifications;

CREATE POLICY notifications_insert_policy ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.users sender
      JOIN public.users recipient ON recipient.org_id = sender.org_id
      WHERE (sender.auth_user_id = auth.uid() OR sender.id = auth.uid())
        AND recipient.id = notifications.user_id
    )
  );

-- 3. search_path
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;

-- 4. anon RPC revokes
DO $$
DECLARE fn regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'create_audit_with_cycle_guard','ensure_current_period_scheduling',
        'reassign_open_audits_for_branch','reassign_unstarted_audits_for_branches',
        'set_audit_approval','set_audit_assigned_to','set_auditor_assignment',
        'set_org_config','submit_audit','log_data_access',
        'validate_rls_for_current_user','handle_new_user'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
  END LOOP;
END $$;

-- 5. auth linkage backfill
UPDATE public.users pu
SET auth_user_id = au.id, updated_at = now()
FROM auth.users au
WHERE lower(au.email) = lower(pu.email)
  AND pu.auth_user_id IS NULL;

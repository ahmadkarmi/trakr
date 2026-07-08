-- ============================================================================
-- Wrap auth.uid() in (select auth.uid()) for the 4 RLS policies flagged by
-- the Supabase performance advisor (auth_rls_initplan). auth.uid() is
-- STABLE, so wrapping it in a scalar subquery only changes *when* Postgres
-- evaluates/caches the call (once per statement via an InitPlan, instead of
-- once per row) — not what it returns. Behavior-preserving.
--
-- users_select_policy matters most: nearly every authenticated request
-- touches `users` (auth mapping, name lookups, role checks).
--
-- Only the auth.uid() calls are wrapped, matching exactly what the advisor
-- flagged — custom helper functions (is_super_admin(), current_user_org_id())
-- are left untouched, out of scope for this fix.
-- ============================================================================

ALTER POLICY users_select_policy ON public.users
  USING (
    (id = (select auth.uid()))
    OR (auth_user_id = (select auth.uid()))
    OR is_super_admin()
    OR ((current_user_org_id() IS NOT NULL) AND (org_id = current_user_org_id()))
  );

ALTER POLICY app_config_read ON public.app_config
  USING ((select auth.uid()) IS NOT NULL);

ALTER POLICY notifications_insert_policy ON public.notifications
  WITH CHECK (
    is_super_admin()
    OR (EXISTS (
      SELECT 1
      FROM public.users sender
      JOIN public.users recipient ON recipient.org_id = sender.org_id
      WHERE ((sender.auth_user_id = (select auth.uid())) OR (sender.id = (select auth.uid())))
        AND recipient.id = notifications.user_id
    ))
  );

ALTER POLICY data_access_audit_insert ON public.data_access_audit
  WITH CHECK ((select auth.uid()) = user_id);

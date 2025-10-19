-- Notifications RLS policies for Admin (org-scoped) and Super Admin (global)

ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

-- Cleanup existing policies (idempotent)
DROP POLICY IF EXISTS notifications_select_owner_or_admin ON public.notifications;
DROP POLICY IF EXISTS notifications_insert_same_org_or_admin ON public.notifications;
DROP POLICY IF EXISTS notifications_update_owner_or_admin ON public.notifications;
DROP POLICY IF EXISTS notifications_delete_owner_or_admin ON public.notifications;

-- SELECT: owner; or admin within same org as target; or super admin
CREATE POLICY notifications_select_owner_or_admin ON public.notifications
  FOR SELECT
  TO authenticated
  USING (
    -- Owner (notifications.user_id may be auth uid or app user id)
    notifications.user_id = auth.uid()
    OR notifications.user_id = (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.users u_target
      WHERE (u_target.id = public.notifications.user_id OR u_target.auth_user_id = public.notifications.user_id)
        AND (
          public.is_super_admin()
          OR (public.is_admin() AND NOT public.is_super_admin() AND u_target.org_id = public.my_org_id())
        )
    )
  );

-- UPDATE: same predicate for marking read or completing actions
CREATE POLICY notifications_update_owner_or_admin ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (
    notifications.user_id = auth.uid()
    OR notifications.user_id = (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.users u_target
      WHERE (u_target.id = public.notifications.user_id OR u_target.auth_user_id = public.notifications.user_id)
        AND (
          public.is_super_admin()
          OR (public.is_admin() AND NOT public.is_super_admin() AND u_target.org_id = public.my_org_id())
        )
    )
  )
  WITH CHECK (
    notifications.user_id = auth.uid()
    OR notifications.user_id = (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.users u_target
      WHERE (u_target.id = public.notifications.user_id OR u_target.auth_user_id = public.notifications.user_id)
        AND (
          public.is_super_admin()
          OR (public.is_admin() AND NOT public.is_super_admin() AND u_target.org_id = public.my_org_id())
        )
    )
  );

-- DELETE: parity
CREATE POLICY notifications_delete_owner_or_admin ON public.notifications
  FOR DELETE
  TO authenticated
  USING (
    notifications.user_id = auth.uid()
    OR notifications.user_id = (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.users u_target
      WHERE (u_target.id = public.notifications.user_id OR u_target.auth_user_id = public.notifications.user_id)
        AND (
          public.is_super_admin()
          OR (public.is_admin() AND NOT public.is_super_admin() AND u_target.org_id = public.my_org_id())
        )
    )
  );

-- INSERT: Super Admin anywhere OR same-org actor->target (keeps auditor/admin ability to create for their org)
CREATE POLICY notifications_insert_same_org_or_admin ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.users u_actor
      JOIN public.users u_target
        ON (u_target.id = public.notifications.user_id OR u_target.auth_user_id = public.notifications.user_id)
      WHERE u_actor.auth_user_id = auth.uid()
        AND u_actor.org_id = u_target.org_id
    )
  );

-- Ensure grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;

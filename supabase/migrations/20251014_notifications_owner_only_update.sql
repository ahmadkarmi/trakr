-- Tighten notifications UPDATE policy: owner-only updates
-- This prevents Admin/Super Admin from marking other users' DB notifications as read at the DB level.
-- Idempotent cleanup of previous update policies.

DROP POLICY IF EXISTS notifications_update_owner_or_admin ON public.notifications;
DROP POLICY IF EXISTS notifications_update_owner_only ON public.notifications;

-- Owner-only UPDATE policy: actor must be the mapped owner of the notification row
CREATE POLICY notifications_update_owner_only ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = public.notifications.user_id
        AND (u.auth_user_id = auth.uid() OR u.id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = public.notifications.user_id
        AND (u.auth_user_id = auth.uid() OR u.id = auth.uid())
    )
  );

-- Parity note: DELETE remains as defined previously. Adjust similarly if needed in the future.
-- Grant remains unchanged; update permission is controlled by policy above.
GRANT UPDATE ON public.notifications TO authenticated;

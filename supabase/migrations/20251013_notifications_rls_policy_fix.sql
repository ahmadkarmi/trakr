-- Notifications RLS fix - map actor via users.auth_user_id and allow same-org inserts
-- Date: 2025-10-13

-- 1) Cleanup existing policies (idempotent)
DROP POLICY IF EXISTS notifications_select_owner_or_admin ON notifications;
DROP POLICY IF EXISTS notifications_insert_same_org_or_admin ON notifications;
DROP POLICY IF EXISTS notifications_update_owner_or_admin ON notifications;
DROP POLICY IF EXISTS notifications_delete_owner_or_admin ON notifications;
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON notifications;
DROP POLICY IF EXISTS notifications_all ON notifications;
DROP POLICY IF EXISTS notifications_select ON notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;

-- 2) SELECT: owner or admins (map actor through users.auth_user_id)
CREATE POLICY notifications_select_owner_or_admin ON notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users u_target
      WHERE u_target.id = notifications.user_id
        AND (
          u_target.auth_user_id = auth.uid()
          OR (SELECT role FROM users WHERE auth_user_id = auth.uid()) IN ('ADMIN','SUPER_ADMIN')
        )
    )
  );

-- 3) INSERT: same org (any role) OR admins
CREATE POLICY notifications_insert_same_org_or_admin ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE auth_user_id = auth.uid()) IN ('ADMIN','SUPER_ADMIN')
    OR EXISTS (
      SELECT 1
      FROM users u_actor
      JOIN users u_target ON u_target.id = notifications.user_id
      WHERE u_actor.auth_user_id = auth.uid()
        AND u_actor.org_id = u_target.org_id
    )
  );

-- 4) UPDATE: owner or admins (for marking read / completing actions)
CREATE POLICY notifications_update_owner_or_admin ON notifications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users u_target
      WHERE u_target.id = notifications.user_id
        AND (
          u_target.auth_user_id = auth.uid()
          OR (SELECT role FROM users WHERE auth_user_id = auth.uid()) IN ('ADMIN','SUPER_ADMIN')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users u_target
      WHERE u_target.id = notifications.user_id
        AND (
          u_target.auth_user_id = auth.uid()
          OR (SELECT role FROM users WHERE auth_user_id = auth.uid()) IN ('ADMIN','SUPER_ADMIN')
        )
    )
  );

-- 5) DELETE: owner or admins (parity)
CREATE POLICY notifications_delete_owner_or_admin ON notifications
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users u_target
      WHERE u_target.id = notifications.user_id
        AND (
          u_target.auth_user_id = auth.uid()
          OR (SELECT role FROM users WHERE auth_user_id = auth.uid()) IN ('ADMIN','SUPER_ADMIN')
        )
    )
  );

-- 6) Ensure grants
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;

-- Optional: verify
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='notifications';

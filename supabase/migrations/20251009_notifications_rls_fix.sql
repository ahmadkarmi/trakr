-- Notifications RLS hardening for multi-tenant approval workflow
-- Date: 2025-10-09

-- 1) Cleanup conflicting/overbroad policies
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON notifications;
DROP POLICY IF EXISTS notifications_all ON notifications;
DROP POLICY IF EXISTS notifications_select ON notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;

-- Ensure idempotency: drop normalized policies if they already exist
DROP POLICY IF EXISTS notifications_select_owner_or_admin ON notifications;
DROP POLICY IF EXISTS notifications_insert_same_org_or_admin ON notifications;
DROP POLICY IF EXISTS notifications_update_owner_or_admin ON notifications;
DROP POLICY IF EXISTS notifications_delete_owner_or_admin ON notifications;

-- 2) Select: owner or admins
CREATE POLICY notifications_select_owner_or_admin ON notifications
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
  );

-- 3) Insert: same org (any role) OR admins
-- This allows auditors to notify their managers and vice versa within same org
CREATE POLICY notifications_insert_same_org_or_admin ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
    OR
    EXISTS (
      SELECT 1
      FROM users u_actor
      JOIN users u_target ON u_target.id = notifications.user_id
      WHERE u_actor.id = auth.uid()
        AND u_actor.org_id = u_target.org_id
    )
  );

-- 4) Update: owner or admins (covers marking as read / completing action)
CREATE POLICY notifications_update_owner_or_admin ON notifications
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
  )
  WITH CHECK (
    user_id = auth.uid() OR
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
  );

-- 5) Delete: owner or admins (optional, parity)
CREATE POLICY notifications_delete_owner_or_admin ON notifications
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
  );

-- 6) Grants (ensure authenticated can DML)
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;

-- Verification (manual):
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='notifications';
-- Try inserts as auditor -> manager (same org) and manager -> auditor.

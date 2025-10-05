-- Comprehensive RLS policy fix for assignment tables
-- Fixes 403/406 errors when managing auditor and branch manager assignments

-- =============================================
-- FIX AUDITOR_ASSIGNMENTS TABLE
-- =============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own auditor assignments" ON auditor_assignments;
DROP POLICY IF EXISTS "Only admins can insert auditor assignments" ON auditor_assignments;
DROP POLICY IF EXISTS "Only admins can update auditor assignments" ON auditor_assignments;
DROP POLICY IF EXISTS "Only admins can delete auditor assignments" ON auditor_assignments;

-- Allow authenticated users to view all assignments
CREATE POLICY "Authenticated users can view auditor assignments"
  ON auditor_assignments
  FOR SELECT
  TO authenticated
  USING (true);

-- Admins and the user themselves can manage their assignments
CREATE POLICY "Admins can manage auditor assignments"
  ON auditor_assignments
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = auth.users.id
      AND auth.users.raw_user_meta_data->>'role' IN ('ADMIN', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = auth.users.id
      AND auth.users.raw_user_meta_data->>'role' IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- Grant necessary permissions
GRANT SELECT ON auditor_assignments TO authenticated;
GRANT INSERT, UPDATE, DELETE ON auditor_assignments TO authenticated;

-- =============================================
-- FIX BRANCH_MANAGER_ASSIGNMENTS TABLE
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own branch manager assignments" ON branch_manager_assignments;
DROP POLICY IF EXISTS "Only admins can insert branch manager assignments" ON branch_manager_assignments;
DROP POLICY IF EXISTS "Only admins can update branch manager assignments" ON branch_manager_assignments;
DROP POLICY IF EXISTS "Only admins can delete branch manager assignments" ON branch_manager_assignments;
DROP POLICY IF EXISTS "Authenticated users can view branch manager assignments" ON branch_manager_assignments;
DROP POLICY IF EXISTS "Admins can insert branch manager assignments" ON branch_manager_assignments;
DROP POLICY IF EXISTS "Admins can update branch manager assignments" ON branch_manager_assignments;
DROP POLICY IF EXISTS "Admins can delete branch manager assignments" ON branch_manager_assignments;

-- Allow all authenticated users to read (needed for notifications)
CREATE POLICY "Authenticated users can view branch manager assignments"
  ON branch_manager_assignments
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage branch manager assignments"
  ON branch_manager_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = auth.users.id
      AND auth.users.raw_user_meta_data->>'role' IN ('ADMIN', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = auth.users.id
      AND auth.users.raw_user_meta_data->>'role' IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- Grant permissions
GRANT SELECT ON branch_manager_assignments TO authenticated;
GRANT INSERT, UPDATE, DELETE ON branch_manager_assignments TO authenticated;

-- Add helpful comments
COMMENT ON POLICY "Authenticated users can view auditor assignments" ON auditor_assignments IS
  'Allows all authenticated users to view auditor assignments for collaboration and notifications';

COMMENT ON POLICY "Admins can manage auditor assignments" ON auditor_assignments IS
  'Allows admins and the assigned user to manage auditor assignments';

COMMENT ON POLICY "Authenticated users can view branch manager assignments" ON branch_manager_assignments IS
  'Allows all authenticated users to view branch manager assignments for notification system';

COMMENT ON POLICY "Admins can manage branch manager assignments" ON branch_manager_assignments IS
  'Only admins can create, update, or delete branch manager assignments';

-- Fix RLS policies for branch_manager_assignments table
-- Allow authenticated users to read assignments (needed for notifications)

-- Drop existing restrictive policies if any
DROP POLICY IF EXISTS "Users can view own branch manager assignments" ON branch_manager_assignments;
DROP POLICY IF EXISTS "Only admins can insert branch manager assignments" ON branch_manager_assignments;
DROP POLICY IF EXISTS "Only admins can update branch manager assignments" ON branch_manager_assignments;
DROP POLICY IF EXISTS "Only admins can delete branch manager assignments" ON branch_manager_assignments;

-- Create new policies that allow authenticated users to read
CREATE POLICY "Authenticated users can view branch manager assignments"
  ON branch_manager_assignments
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can insert branch manager assignments"
  ON branch_manager_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = auth.users.id
      AND auth.users.raw_user_meta_data->>'role' IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Admins can update branch manager assignments"
  ON branch_manager_assignments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = auth.users.id
      AND auth.users.raw_user_meta_data->>'role' IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Admins can delete branch manager assignments"
  ON branch_manager_assignments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = auth.users.id
      AND auth.users.raw_user_meta_data->>'role' IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- Grant SELECT permission to authenticated users
GRANT SELECT ON branch_manager_assignments TO authenticated;

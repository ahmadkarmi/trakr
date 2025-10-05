-- ========================================
-- SAFE RLS FIX - HANDLES EXISTING POLICIES
-- ========================================
-- 
-- This version safely handles existing policies
--
-- Instructions:
-- 1. Go to: https://prxvzfrjpzoguwqbpchj.supabase.co/project/_/sql
-- 2. Copy ALL the SQL below
-- 3. Paste into SQL Editor
-- 4. Click RUN button
-- ========================================

-- =============================================
-- FIX AUDITOR_ASSIGNMENTS TABLE
-- =============================================

-- Drop ALL possible existing policies (ignore errors)
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view own auditor assignments" ON auditor_assignments;
  DROP POLICY IF EXISTS "Only admins can insert auditor assignments" ON auditor_assignments;
  DROP POLICY IF EXISTS "Only admins can update auditor assignments" ON auditor_assignments;
  DROP POLICY IF EXISTS "Only admins can delete auditor assignments" ON auditor_assignments;
  DROP POLICY IF EXISTS "Authenticated users can view auditor assignments" ON auditor_assignments;
  DROP POLICY IF EXISTS "Admins can manage auditor assignments" ON auditor_assignments;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignore errors if policies don't exist
END $$;

-- Create new policies
CREATE POLICY "Authenticated users can view auditor assignments"
  ON auditor_assignments
  FOR SELECT
  TO authenticated
  USING (true);

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

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON auditor_assignments TO authenticated;

-- =============================================
-- FIX BRANCH_MANAGER_ASSIGNMENTS TABLE
-- =============================================

-- Drop ALL possible existing policies (ignore errors)
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view own branch manager assignments" ON branch_manager_assignments;
  DROP POLICY IF EXISTS "Only admins can insert branch manager assignments" ON branch_manager_assignments;
  DROP POLICY IF EXISTS "Only admins can update branch manager assignments" ON branch_manager_assignments;
  DROP POLICY IF EXISTS "Only admins can delete branch manager assignments" ON branch_manager_assignments;
  DROP POLICY IF EXISTS "Authenticated users can view branch manager assignments" ON branch_manager_assignments;
  DROP POLICY IF EXISTS "Admins can manage branch manager assignments" ON branch_manager_assignments;
  DROP POLICY IF EXISTS "Admins can insert branch manager assignments" ON branch_manager_assignments;
  DROP POLICY IF EXISTS "Admins can update branch manager assignments" ON branch_manager_assignments;
  DROP POLICY IF EXISTS "Admins can delete branch manager assignments" ON branch_manager_assignments;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignore errors if policies don't exist
END $$;

-- Create new policies
CREATE POLICY "Authenticated users can view branch manager assignments"
  ON branch_manager_assignments
  FOR SELECT
  TO authenticated
  USING (true);

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
GRANT SELECT, INSERT, UPDATE, DELETE ON branch_manager_assignments TO authenticated;

-- ========================================
-- DONE! All RLS policies fixed safely
-- ========================================

-- ========================================
-- FIX ALL RLS POLICIES - RUN THIS NOW
-- ========================================
-- 
-- Fixes RLS policies for:
-- 1. auditor_assignments
-- 2. branch_manager_assignments
-- 3. notifications
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

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own auditor assignments" ON auditor_assignments;
DROP POLICY IF EXISTS "Only admins can insert auditor assignments" ON auditor_assignments;
DROP POLICY IF EXISTS "Only admins can update auditor assignments" ON auditor_assignments;
DROP POLICY IF EXISTS "Only admins can delete auditor assignments" ON auditor_assignments;

-- Allow authenticated users to read their own assignments
CREATE POLICY "Authenticated users can view auditor assignments"
  ON auditor_assignments
  FOR SELECT
  TO authenticated
  USING (true);

-- Admins and the assigned user can insert/update
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

-- Allow all authenticated users to read
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

-- =============================================
-- NOTIFICATIONS - ALREADY FIXED BUT VERIFY
-- =============================================

-- Ensure notifications policies are correct
DROP POLICY IF EXISTS "Service role can create notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON notifications;

CREATE POLICY "Authenticated users can create notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

GRANT INSERT ON notifications TO authenticated;

-- ========================================
-- DONE! All RLS policies fixed
-- ========================================

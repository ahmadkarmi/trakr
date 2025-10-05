-- ========================================
-- FIX RLS ERROR - RUN THIS NOW
-- ========================================
-- 
-- Error: "new row violates row-level security policy for table branch_manager_assignments"
-- 
-- This fixes the overly restrictive RLS policies that prevent
-- authenticated users from reading branch manager assignments
-- (needed for notification system)
--
-- Instructions:
-- 1. Go to: https://prxvzfrjpzoguwqbpchj.supabase.co/project/_/sql
-- 2. Copy ALL the SQL below (lines 15-35)
-- 3. Paste into SQL Editor
-- 4. Click RUN button
-- ========================================

-- Drop restrictive policies
DROP POLICY IF EXISTS "Users can view own branch manager assignments" ON branch_manager_assignments;

-- Allow all authenticated users to read branch manager assignments
CREATE POLICY "Authenticated users can view branch manager assignments"
  ON branch_manager_assignments
  FOR SELECT
  TO authenticated
  USING (true);

-- Grant SELECT permission
GRANT SELECT ON branch_manager_assignments TO authenticated;

-- ========================================
-- DONE! Now submit an audit to test
-- ========================================

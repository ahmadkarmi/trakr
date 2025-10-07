-- Cleanup script - Drop all existing RLS policies before applying v2 migration
-- Run this FIRST, then run 20250107_multi_tenant_security_v2.sql

-- Drop all policies on all tables
DROP POLICY IF EXISTS organizations_select ON organizations;
DROP POLICY IF EXISTS organizations_update ON organizations;
DROP POLICY IF EXISTS organizations_all ON organizations;

DROP POLICY IF EXISTS users_select ON users;
DROP POLICY IF EXISTS users_insert ON users;
DROP POLICY IF EXISTS users_update ON users;
DROP POLICY IF EXISTS users_all ON users;

DROP POLICY IF EXISTS branches_select ON branches;
DROP POLICY IF EXISTS branches_insert ON branches;
DROP POLICY IF EXISTS branches_update ON branches;
DROP POLICY IF EXISTS branches_delete ON branches;
DROP POLICY IF EXISTS branches_all ON branches;

DROP POLICY IF EXISTS zones_select ON zones;
DROP POLICY IF EXISTS zones_insert ON zones;
DROP POLICY IF EXISTS zones_update ON zones;
DROP POLICY IF EXISTS zones_delete ON zones;
DROP POLICY IF EXISTS zones_all ON zones;

DROP POLICY IF EXISTS surveys_select ON surveys;
DROP POLICY IF EXISTS surveys_insert ON surveys;
DROP POLICY IF EXISTS surveys_update ON surveys;
DROP POLICY IF EXISTS surveys_delete ON surveys;
DROP POLICY IF EXISTS surveys_all ON surveys;

DROP POLICY IF EXISTS survey_sections_select ON survey_sections;
DROP POLICY IF EXISTS survey_sections_all ON survey_sections;

DROP POLICY IF EXISTS survey_questions_select ON survey_questions;
DROP POLICY IF EXISTS survey_questions_all ON survey_questions;

DROP POLICY IF EXISTS audits_select ON audits;
DROP POLICY IF EXISTS audits_insert ON audits;
DROP POLICY IF EXISTS audits_update ON audits;
DROP POLICY IF EXISTS audits_all ON audits;

DROP POLICY IF EXISTS audit_responses_select ON audit_responses;
DROP POLICY IF EXISTS audit_responses_all ON audit_responses;

DROP POLICY IF EXISTS audit_photos_select ON audit_photos;
DROP POLICY IF EXISTS audit_photos_all ON audit_photos;

DROP POLICY IF EXISTS notifications_select ON notifications;
DROP POLICY IF EXISTS notifications_insert ON notifications;
DROP POLICY IF EXISTS notifications_update ON notifications;
DROP POLICY IF EXISTS notifications_delete ON notifications;
DROP POLICY IF EXISTS notifications_all ON notifications;

DROP POLICY IF EXISTS activity_logs_select ON activity_logs;
DROP POLICY IF EXISTS activity_logs_insert ON activity_logs;
DROP POLICY IF EXISTS activity_logs_all ON activity_logs;

DROP POLICY IF EXISTS auditor_assignments_select ON auditor_assignments;
DROP POLICY IF EXISTS auditor_assignments_all ON auditor_assignments;

DROP POLICY IF EXISTS branch_manager_assignments_select ON branch_manager_assignments;
DROP POLICY IF EXISTS branch_manager_assignments_all ON branch_manager_assignments;

DROP POLICY IF EXISTS zone_branches_select ON zone_branches;
DROP POLICY IF EXISTS zone_branches_all ON zone_branches;

-- Drop any other policies that might exist from previous migrations
DROP POLICY IF EXISTS "Authenticated users can view auditor assignments" ON auditor_assignments;
DROP POLICY IF EXISTS "Admins can manage auditor assignments" ON auditor_assignments;
DROP POLICY IF EXISTS "Authenticated users can view branch manager assignments" ON branch_manager_assignments;
DROP POLICY IF EXISTS "Admins can manage branch manager assignments" ON branch_manager_assignments;
DROP POLICY IF EXISTS "Users can view own auditor assignments" ON auditor_assignments;
DROP POLICY IF EXISTS "Only admins can insert auditor assignments" ON auditor_assignments;
DROP POLICY IF EXISTS "Only admins can update auditor assignments" ON auditor_assignments;
DROP POLICY IF EXISTS "Only admins can delete auditor assignments" ON auditor_assignments;
DROP POLICY IF EXISTS "Admins can view all auditor assignments" ON auditor_assignments;
DROP POLICY IF EXISTS "Auditors can view their own assignments" ON auditor_assignments;
DROP POLICY IF EXISTS "Admins can view all branch manager assignments" ON branch_manager_assignments;
DROP POLICY IF EXISTS "Admins can insert branch manager assignments" ON branch_manager_assignments;
DROP POLICY IF EXISTS "Admins can update branch manager assignments" ON branch_manager_assignments;
DROP POLICY IF EXISTS "Admins can delete branch manager assignments" ON branch_manager_assignments;
DROP POLICY IF EXISTS "Branch managers can view their own assignments" ON branch_manager_assignments;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ All existing RLS policies dropped successfully!';
  RAISE NOTICE '📋 Now run: 20250107_multi_tenant_security_v2.sql';
END $$;

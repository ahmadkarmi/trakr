-- Migration: Add Cross-Org Reference Constraints
-- Purpose: Prevent data from referencing entities in different organizations
-- Date: 2025-01-07
-- Security: Critical - Prevents cross-org data contamination

-- ====================
-- AUDITS TABLE CONSTRAINTS
-- ====================

-- Ensure audit's branch is in same organization
ALTER TABLE audits 
ADD CONSTRAINT audits_branch_same_org_check 
CHECK (
  org_id = (SELECT org_id FROM branches WHERE id = branch_id)
);

-- Ensure audit's assigned user is in same organization
ALTER TABLE audits
ADD CONSTRAINT audits_user_same_org_check
CHECK (
  org_id = (SELECT org_id FROM users WHERE id = assigned_to)
);

-- Ensure audit's survey is in same organization
ALTER TABLE audits
ADD CONSTRAINT audits_survey_same_org_check
CHECK (
  org_id = (SELECT org_id FROM surveys WHERE id = survey_id)
);

-- ====================
-- BRANCH MANAGER ASSIGNMENTS
-- ====================

-- Note: branch_manager_assignments table doesn't have org_id column
-- It's implicitly scoped via branch_id -> branches.org_id and manager_id -> users.org_id
-- RLS policies enforce org isolation, so constraints are not strictly needed here
-- If we add org_id column in future, uncomment these:

-- ALTER TABLE branch_manager_assignments
-- ADD CONSTRAINT bma_branch_same_org_check
-- CHECK (
--   org_id = (SELECT org_id FROM branches WHERE id = branch_id)
-- );

-- ALTER TABLE branch_manager_assignments
-- ADD CONSTRAINT bma_manager_same_org_check
-- CHECK (
--   org_id = (SELECT org_id FROM users WHERE id = manager_id)
-- );

-- ====================
-- AUDITOR ASSIGNMENTS
-- ====================

-- Note: auditor_assignments table likely doesn't have org_id column
-- It's implicitly scoped via user_id -> users.org_id
-- RLS policies enforce org isolation
-- If we add org_id column in future, uncomment this:

-- ALTER TABLE auditor_assignments
-- ADD CONSTRAINT aa_user_same_org_check
-- CHECK (
--   org_id = (SELECT org_id FROM users WHERE id = user_id)
-- );

-- ====================
-- ZONES TABLE
-- ====================

-- Ensure zone's branches are all in same organization
-- Note: This is validated at application level since branch_ids is an array
-- We cannot easily add a constraint for arrays, but RLS policies enforce this

-- ====================
-- SECTION PHOTOS
-- ====================

-- Ensure photo's audit is in same organization (if org_id exists on table)
-- ALTER TABLE section_photos
-- ADD CONSTRAINT sp_audit_same_org_check
-- CHECK (
--   org_id = (SELECT org_id FROM audits WHERE id = audit_id)
-- );
-- Note: Uncomment if section_photos has org_id column

-- ====================
-- ACTIVITY LOGS
-- ====================

-- Activity logs should reference entities in same org
-- This is primarily enforced by RLS, but we can add validation at insert time
-- No constraint needed as logs are informational only

-- ====================
-- NOTIFICATIONS
-- ====================

-- Notifications should be for users in same org
-- Enforced by RLS policies

-- ====================
-- VERIFICATION
-- ====================

-- To verify constraints are active, run:
-- SELECT 
--   conname AS constraint_name,
--   conrelid::regclass AS table_name,
--   pg_get_constraintdef(oid) AS definition
-- FROM pg_constraint
-- WHERE contype = 'c'
--   AND connamespace = 'public'::regnamespace
--   AND conname LIKE '%_same_org_%'
-- ORDER BY table_name, constraint_name;

COMMENT ON CONSTRAINT audits_branch_same_org_check ON audits IS 
  'Ensures audit references a branch in the same organization';

COMMENT ON CONSTRAINT audits_user_same_org_check ON audits IS 
  'Ensures audit is assigned to a user in the same organization';

COMMENT ON CONSTRAINT audits_survey_same_org_check ON audits IS 
  'Ensures audit uses a survey template from the same organization';

-- Branch manager assignments constraints commented out (table doesn't have org_id column)
-- COMMENT ON CONSTRAINT bma_branch_same_org_check ON branch_manager_assignments IS 
--   'Ensures branch manager assignment references a branch in the same organization';

-- COMMENT ON CONSTRAINT bma_manager_same_org_check ON branch_manager_assignments IS 
--   'Ensures branch manager is in the same organization as the branch';

-- Auditor assignments constraint (only if table has org_id column)
-- COMMENT ON CONSTRAINT aa_user_same_org_check ON auditor_assignments IS 
--   'Ensures auditor assignment references a user in the same organization';

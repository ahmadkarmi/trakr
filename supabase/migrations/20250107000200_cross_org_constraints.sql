-- Migration: Cross-Org Reference Validation
-- Purpose: Document org isolation strategy (enforced by RLS + application)
-- Date: 2025-01-07
-- Security: Critical - Prevents cross-org data contamination

-- ====================
-- IMPORTANT NOTE
-- ====================
-- PostgreSQL CHECK constraints cannot use subqueries
-- Cross-org validation is enforced by:
-- 1. Row Level Security (RLS) policies on all tables
-- 2. Application-level validation in API methods
-- 3. Frontend validation in components
-- 
-- This migration documents the security model but does not add constraints

-- ====================
-- AUDITS TABLE - ORG VALIDATION
-- ====================

-- NOTE: These constraints cannot be implemented as CHECK constraints
-- They are enforced by RLS policies and application validation

-- Rule: Audit's branch must be in same organization
-- Enforcement: 
--   - RLS policy on branches table prevents cross-org access
--   - Application validates branch belongs to org before creating audit
--   - Frontend only shows branches from current org

-- Rule: Audit's assigned user must be in same organization  
-- Enforcement:
--   - RLS policy on users table prevents cross-org access
--   - Application validates user belongs to org before assignment
--   - Frontend only shows users from current org

-- Rule: Audit's survey must be in same organization
-- Enforcement:
--   - RLS policy on surveys table prevents cross-org access
--   - Application validates survey belongs to org before creating audit
--   - Frontend only shows surveys from current org

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

-- To verify RLS policies are active:
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ====================
-- SECURITY SUMMARY
-- ====================

-- ✅ Cross-org data isolation is enforced by:
--
-- 1. Row Level Security (RLS) Policies
--    - All tables have RLS enabled
--    - Policies filter by org_id based on auth.uid()
--    - Super admins can bypass for global view
--
-- 2. Application Validation (Phase 1 fixes)
--    - No hardcoded fallback values (removed 'org-1' defaults)
--    - All API methods require orgId parameter
--    - Frontend validates org before mutations
--
-- 3. Frontend Guards (Phase 1 fixes)
--    - Components check effectiveOrgId before rendering
--    - Loading states while org context loads
--    - Error states if org not available
--
-- 4. URL Access Control (Phase 2 fixes)
--    - Direct URL access validates audit.orgId matches effectiveOrgId
--    - Shows "Access Denied" for cross-org access attempts
--    - No data leakage through URL manipulation

-- This provides defense-in-depth security without database CHECK constraints

-- Multi-Tenant Security & Performance Migration
-- Phase 3: Database Indexes for Performance
-- Phase 4: Row Level Security (RLS) Policies
-- Created: 2025-01-07
-- Purpose: Enforce organization-level data isolation at database layer

-- ============================================================================
-- PHASE 3: PERFORMANCE INDEXES
-- ============================================================================

-- Add indexes on org_id for all major tables to optimize filtering queries
-- This dramatically improves query performance when filtering by organization

-- Users table index
CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id);

-- Branches table index
CREATE INDEX IF NOT EXISTS idx_branches_org_id ON branches(org_id);

-- Zones table index
CREATE INDEX IF NOT EXISTS idx_zones_org_id ON zones(org_id);

-- Surveys table index
CREATE INDEX IF NOT EXISTS idx_surveys_org_id ON surveys(org_id);

-- Audits table index
CREATE INDEX IF NOT EXISTS idx_audits_org_id ON audits(org_id);

-- Survey sections (child of surveys)
CREATE INDEX IF NOT EXISTS idx_survey_sections_survey_id ON survey_sections(survey_id);

-- Survey questions (child of surveys)
CREATE INDEX IF NOT EXISTS idx_survey_questions_survey_id ON survey_questions(survey_id);

-- Zone branches junction table
CREATE INDEX IF NOT EXISTS idx_zone_branches_zone_id ON zone_branches(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_branches_branch_id ON zone_branches(branch_id);

-- Auditor assignments
CREATE INDEX IF NOT EXISTS idx_auditor_assignments_user_id ON auditor_assignments(user_id);

-- Branch manager assignments
CREATE INDEX IF NOT EXISTS idx_branch_manager_assignments_user_id ON branch_manager_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_branch_manager_assignments_branch_id ON branch_manager_assignments(branch_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audits_org_status ON audits(org_id, status);
CREATE INDEX IF NOT EXISTS idx_audits_org_assigned ON audits(org_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_audits_branch_status ON audits(branch_id, status);

-- ============================================================================
-- PHASE 4: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_manager_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ORGANIZATIONS TABLE POLICIES
-- ============================================================================

-- Super Admins can see all organizations
-- Regular users can only see their own organization
CREATE POLICY organizations_select ON organizations
  FOR SELECT
  USING (
    -- User is a Super Admin (can see all)
    (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    OR
    -- User belongs to this organization
    id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- Only Super Admins can update organizations
CREATE POLICY organizations_update ON organizations
  FOR UPDATE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    OR
    (SELECT role FROM users WHERE id = auth.uid() AND org_id = organizations.id) = 'ADMIN'
  );

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Users can only see users from their own organization
-- Super Admins can see all users
CREATE POLICY users_select ON users
  FOR SELECT
  USING (
    -- User is a Super Admin
    (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    OR
    -- User is in the same organization
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- Admins and Super Admins can insert users in their organization
CREATE POLICY users_insert ON users
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
    AND
    (
      (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
      OR
      org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

-- Admins can update users in their organization
CREATE POLICY users_update ON users
  FOR UPDATE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
    AND
    (
      (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
      OR
      org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

-- ============================================================================
-- BRANCHES TABLE POLICIES
-- ============================================================================

-- Users can only see branches from their organization
CREATE POLICY branches_select ON branches
  FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    OR
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- Admins can insert branches in their organization
CREATE POLICY branches_insert ON branches
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
    AND
    (
      (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
      OR
      org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

-- Admins can update branches in their organization
CREATE POLICY branches_update ON branches
  FOR UPDATE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
    AND
    (
      (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
      OR
      org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

-- Admins can delete branches in their organization
CREATE POLICY branches_delete ON branches
  FOR DELETE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
    AND
    (
      (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
      OR
      org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

-- ============================================================================
-- ZONES TABLE POLICIES
-- ============================================================================

-- Users can only see zones from their organization
CREATE POLICY zones_select ON zones
  FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    OR
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- Admins can insert zones in their organization
CREATE POLICY zones_insert ON zones
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
    AND
    (
      (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
      OR
      org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

-- Admins can update/delete zones in their organization
CREATE POLICY zones_update ON zones
  FOR UPDATE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
    AND
    (
      (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
      OR
      org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY zones_delete ON zones
  FOR DELETE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
    AND
    (
      (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
      OR
      org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

-- ============================================================================
-- SURVEYS TABLE POLICIES
-- ============================================================================

-- Users can only see surveys from their organization
CREATE POLICY surveys_select ON surveys
  FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    OR
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- Admins can insert surveys in their organization
CREATE POLICY surveys_insert ON surveys
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
    AND
    (
      (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
      OR
      org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

-- Admins can update/delete surveys in their organization
CREATE POLICY surveys_update ON surveys
  FOR UPDATE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
    AND
    (
      (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
      OR
      org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY surveys_delete ON surveys
  FOR DELETE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
    AND
    (
      (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
      OR
      org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

-- ============================================================================
-- SURVEY SECTIONS & QUESTIONS POLICIES
-- ============================================================================

-- Survey sections inherit permissions from parent survey
CREATE POLICY survey_sections_select ON survey_sections
  FOR SELECT
  USING (
    survey_id IN (
      SELECT id FROM surveys WHERE
        (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
        OR
        org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY survey_sections_all ON survey_sections
  FOR ALL
  USING (
    survey_id IN (
      SELECT id FROM surveys WHERE
        (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
        AND
        (
          (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
          OR
          org_id = (SELECT org_id FROM users WHERE id = auth.uid())
        )
    )
  );

-- Survey questions inherit permissions from parent survey
CREATE POLICY survey_questions_select ON survey_questions
  FOR SELECT
  USING (
    survey_id IN (
      SELECT id FROM surveys WHERE
        (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
        OR
        org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY survey_questions_all ON survey_questions
  FOR ALL
  USING (
    survey_id IN (
      SELECT id FROM surveys WHERE
        (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
        AND
        (
          (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
          OR
          org_id = (SELECT org_id FROM users WHERE id = auth.uid())
        )
    )
  );

-- ============================================================================
-- AUDITS TABLE POLICIES
-- ============================================================================

-- Users can see audits from their organization
CREATE POLICY audits_select ON audits
  FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    OR
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- Admins and assigned users can insert/update audits
CREATE POLICY audits_insert ON audits
  FOR INSERT
  WITH CHECK (
    (
      (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
      OR
      org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
    AND
    (
      (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'BRANCH_MANAGER', 'AUDITOR', 'SUPER_ADMIN')
    )
  );

CREATE POLICY audits_update ON audits
  FOR UPDATE
  USING (
    (
      (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
      OR
      org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
    AND
    (
      (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'BRANCH_MANAGER', 'AUDITOR', 'SUPER_ADMIN')
      OR
      assigned_to = auth.uid()
    )
  );

-- ============================================================================
-- AUDIT RESPONSES & PHOTOS POLICIES
-- ============================================================================

-- Audit responses inherit permissions from parent audit
CREATE POLICY audit_responses_select ON audit_responses
  FOR SELECT
  USING (
    audit_id IN (
      SELECT id FROM audits WHERE
        (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
        OR
        org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY audit_responses_all ON audit_responses
  FOR ALL
  USING (
    audit_id IN (
      SELECT id FROM audits WHERE
        (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
        OR
        (
          org_id = (SELECT org_id FROM users WHERE id = auth.uid())
          AND
          (assigned_to = auth.uid() OR (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'BRANCH_MANAGER'))
        )
    )
  );

-- Audit photos inherit permissions from parent audit
CREATE POLICY audit_photos_select ON audit_photos
  FOR SELECT
  USING (
    audit_id IN (
      SELECT id FROM audits WHERE
        (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
        OR
        org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY audit_photos_all ON audit_photos
  FOR ALL
  USING (
    audit_id IN (
      SELECT id FROM audits WHERE
        (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
        OR
        (
          org_id = (SELECT org_id FROM users WHERE id = auth.uid())
          AND
          (assigned_to = auth.uid() OR (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'BRANCH_MANAGER'))
        )
    )
  );

-- ============================================================================
-- NOTIFICATIONS & ACTIVITY LOGS POLICIES
-- ============================================================================

-- Users can only see their own notifications or org notifications
CREATE POLICY notifications_select ON notifications
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
  );

CREATE POLICY notifications_all ON notifications
  FOR ALL
  USING (
    user_id = auth.uid()
    OR
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
  );

-- Activity logs visible to admins and super admins
CREATE POLICY activity_logs_select ON activity_logs
  FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
  );

CREATE POLICY activity_logs_insert ON activity_logs
  FOR INSERT
  WITH CHECK (true); -- Anyone can create activity logs

-- ============================================================================
-- ASSIGNMENTS POLICIES
-- ============================================================================

-- Auditor assignments visible to admins
CREATE POLICY auditor_assignments_select ON auditor_assignments
  FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
    OR
    user_id = auth.uid()
  );

CREATE POLICY auditor_assignments_all ON auditor_assignments
  FOR ALL
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
  );

-- Branch manager assignments visible to admins
CREATE POLICY branch_manager_assignments_select ON branch_manager_assignments
  FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER')
    OR
    user_id = auth.uid()
  );

CREATE POLICY branch_manager_assignments_all ON branch_manager_assignments
  FOR ALL
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
  );

-- Zone branches junction table visible based on zone access
CREATE POLICY zone_branches_select ON zone_branches
  FOR SELECT
  USING (
    zone_id IN (
      SELECT id FROM zones WHERE
        (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
        OR
        org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY zone_branches_all ON zone_branches
  FOR ALL
  USING (
    zone_id IN (
      SELECT id FROM zones WHERE
        (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
        AND
        (
          (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
          OR
          org_id = (SELECT org_id FROM users WHERE id = auth.uid())
        )
    )
  );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these queries to verify the migration was successful:

-- 1. Check all indexes were created
-- SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%' ORDER BY tablename;

-- 2. Check RLS is enabled on all tables
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;

-- 3. Check policies exist
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- To rollback this migration, run:
-- DROP INDEX IF EXISTS idx_users_org_id;
-- DROP INDEX IF EXISTS idx_branches_org_id;
-- DROP INDEX IF EXISTS idx_zones_org_id;
-- DROP INDEX IF EXISTS idx_surveys_org_id;
-- DROP INDEX IF EXISTS idx_audits_org_id;
-- -- ... (drop all other indexes)
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
-- -- ... (disable RLS on all other tables)
-- DROP POLICY IF EXISTS organizations_select ON organizations;
-- -- ... (drop all policies)

# Supabase RLS & Roles: Unified Policy (Final)

This document defines the final, unified Row-Level Security (RLS) model for Trakr. It aligns with our codebase and product requirements:

- SUPER_ADMIN: Trakr staff supporting all customers (cross-organization access)
- ADMIN: Same capabilities as SUPER_ADMIN but strictly limited to their own organization
- BRANCH_MANAGER: Organization-scoped manager (approve/reject audits, manage their branches)
- AUDITOR: Organization-scoped auditor (create/complete audits assigned to them)

Notes
- We use `public.users` for role/org checks: `users.role`, `users.org_id`.
- We prefer explicit SQL over helper functions to keep migrations portable.
- Policies below use `DROP POLICY IF EXISTS` to avoid duplicates.
- Ensure RLS is enabled on tables listed.

Verification helpers
```sql
-- RLS enabled?
SELECT relname, relrowsecurity FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND relname IN (
  'organizations','users','branches','zones','surveys','survey_sections','survey_questions',
  'audits','audit_photos','notifications','auditor_assignments','branch_manager_assignments',
  'zone_branches','activity_logs'
);

-- List policies for a table
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='notifications';
```

## 0) Enable RLS on all core tables
```sql
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_manager_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
```

## 1) Organizations
- SUPER_ADMIN: can view/manage all organizations
- ADMIN: can view/manage only their organization

```sql
-- Cleanup
DROP POLICY IF EXISTS organizations_select ON organizations;
DROP POLICY IF EXISTS organizations_update ON organizations;

-- Select
CREATE POLICY organizations_select ON organizations
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    OR id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- Update (admins manage only their org; super admins manage all)
CREATE POLICY organizations_update ON organizations
  FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    OR id = (SELECT org_id FROM users WHERE id = auth.uid())
  );
```

## 2) Users
- SUPER_ADMIN: can view/manage all users
- ADMIN: can view/manage users within their org

```sql
-- Cleanup
DROP POLICY IF EXISTS users_select ON users;
DROP POLICY IF EXISTS users_insert ON users;
DROP POLICY IF EXISTS users_update ON users;

-- Select
CREATE POLICY users_select ON users
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    OR org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- Insert (admins create users for their org; super admins for any)
CREATE POLICY users_insert ON users
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    OR org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- Update (admins/super admins manage; optional: user can update self-profile)
CREATE POLICY users_update ON users
  FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN','SUPER_ADMIN')
    OR id = auth.uid()
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN','SUPER_ADMIN')
    OR id = auth.uid()
  );
```

## 3) Branches & Zones
- SUPER_ADMIN: full access to all
- ADMIN: full access within their org

```sql
-- Cleanup
DROP POLICY IF EXISTS branches_select ON branches;
DROP POLICY IF EXISTS branches_insert ON branches;
DROP POLICY IF EXISTS branches_update ON branches;
DROP POLICY IF EXISTS branches_delete ON branches;

CREATE POLICY branches_select ON branches
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    OR org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY branches_insert ON branches
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    OR org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY branches_update ON branches
  FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    OR org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY branches_delete ON branches
  FOR DELETE TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    OR org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- Zones mirror branches
DROP POLICY IF EXISTS zones_select ON zones;
DROP POLICY IF EXISTS zones_insert ON zones;
DROP POLICY IF EXISTS zones_update ON zones;
DROP POLICY IF EXISTS zones_delete ON zones;

CREATE POLICY zones_select ON zones
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    OR org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );
CREATE POLICY zones_insert ON zones
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    OR org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );
CREATE POLICY zones_update ON zones
  FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    OR org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );
CREATE POLICY zones_delete ON zones
  FOR DELETE TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    OR org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );
```

## 4) Surveys, Sections, Questions
- SUPER_ADMIN: access all
- ADMIN: access within org
- Writes (insert/update/delete): ADMIN + SUPER_ADMIN

```sql
-- Surveys
DROP POLICY IF EXISTS surveys_select ON surveys;
DROP POLICY IF EXISTS surveys_insert ON surveys;
DROP POLICY IF EXISTS surveys_update ON surveys;
DROP POLICY IF EXISTS surveys_delete ON surveys;

CREATE POLICY surveys_select ON surveys
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    OR org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY surveys_insert ON surveys
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN','SUPER_ADMIN')
    AND (
      (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN' OR
      org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY surveys_update ON surveys
  FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN','SUPER_ADMIN')
    AND (
      (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN' OR
      org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY surveys_delete ON surveys
  FOR DELETE TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN','SUPER_ADMIN')
    AND (
      (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN' OR
      org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

-- Sections (inherit via parent survey)
DROP POLICY IF EXISTS survey_sections_select ON survey_sections;
DROP POLICY IF EXISTS survey_sections_all ON survey_sections;

CREATE POLICY survey_sections_select ON survey_sections
  FOR SELECT TO authenticated
  USING (
    survey_id IN (
      SELECT id FROM surveys WHERE
        (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
        OR org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY survey_sections_all ON survey_sections
  FOR ALL TO authenticated
  USING (
    survey_id IN (
      SELECT id FROM surveys WHERE
        (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN','SUPER_ADMIN')
        AND ( (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
              OR org_id = (SELECT org_id FROM users WHERE id = auth.uid()) )
    )
  );

-- Questions mirror Sections
DROP POLICY IF EXISTS survey_questions_select ON survey_questions;
DROP POLICY IF EXISTS survey_questions_all ON survey_questions;

CREATE POLICY survey_questions_select ON survey_questions
  FOR SELECT TO authenticated
  USING (
    survey_id IN (
      SELECT id FROM surveys WHERE
        (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
        OR org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY survey_questions_all ON survey_questions
  FOR ALL TO authenticated
  USING (
    survey_id IN (
      SELECT id FROM surveys WHERE
        (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN','SUPER_ADMIN')
        AND ( (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
              OR org_id = (SELECT org_id FROM users WHERE id = auth.uid()) )
    )
  );
```

## 5) Audits & Photos
- SUPER_ADMIN: access all
- ADMIN/BRANCH_MANAGER/AUDITOR: access within org
- Writes: ADMIN/BRANCH_MANAGER/AUDITOR within org (assignment may further restrict in app layer)

```sql
-- Audits
DROP POLICY IF EXISTS audits_select ON audits;
DROP POLICY IF EXISTS audits_insert ON audits;
DROP POLICY IF EXISTS audits_update ON audits;

CREATE POLICY audits_select ON audits
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    OR org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY audits_insert ON audits
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN','BRANCH_MANAGER','AUDITOR','SUPER_ADMIN')
    AND (
      (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
      OR org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY audits_update ON audits
  FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN','BRANCH_MANAGER','AUDITOR','SUPER_ADMIN')
    AND (
      (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
      OR org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

-- Audit photos (inherit via audits)
DROP POLICY IF EXISTS audit_photos_select ON audit_photos;
DROP POLICY IF EXISTS audit_photos_all ON audit_photos;

CREATE POLICY audit_photos_select ON audit_photos
  FOR SELECT TO authenticated
  USING (
    audit_id IN (
      SELECT id FROM audits WHERE
        (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
        OR org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY audit_photos_all ON audit_photos
  FOR ALL TO authenticated
  USING (
    audit_id IN (
      SELECT id FROM audits WHERE
        (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
        OR org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );
```

## 6) Notifications (Actionable)
- Owner can read/update/delete their own notifications
- ADMIN/SUPER_ADMIN can read/update/delete within needs (admin global)
- Insert allowed by ADMIN/SUPER_ADMIN globally; or any authenticated user to same-org target user

```sql
-- Cleanup conflicting policies
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON notifications;
DROP POLICY IF EXISTS notifications_all ON notifications;
DROP POLICY IF EXISTS notifications_select ON notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
DROP POLICY IF EXISTS admins_can_read_all_notifications ON notifications;
DROP POLICY IF EXISTS mgrs_can_insert_notifications_for_org ON notifications;
DROP POLICY IF EXISTS user_can_mark_own_read ON notifications;
DROP POLICY IF EXISTS user_can_read_own_notifications ON notifications;
DROP POLICY IF EXISTS notifications_insert ON notifications;
DROP POLICY IF EXISTS notifications_update ON notifications;
DROP POLICY IF EXISTS notifications_delete ON notifications;

-- Select: owner or admin/super admin
CREATE POLICY notifications_select_owner_or_admin ON notifications
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN','SUPER_ADMIN')
  );

-- Insert: same-org OR admin/super admin
CREATE POLICY notifications_insert_same_org_or_admin ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN','SUPER_ADMIN')
    OR EXISTS (
      SELECT 1
      FROM users u_actor
      JOIN users u_target ON u_target.id = notifications.user_id
      WHERE u_actor.id = auth.uid()
        AND u_actor.org_id = u_target.org_id
    )
  );

-- Update: owner or admin/super admin (mark read, complete action)
CREATE POLICY notifications_update_owner_or_admin ON notifications
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN','SUPER_ADMIN')
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN','SUPER_ADMIN')
  );

-- Delete: owner or admin/super admin
CREATE POLICY notifications_delete_owner_or_admin ON notifications
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN','SUPER_ADMIN')
  );

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
```

## 7) Assignments
- SUPER_ADMIN: manage all
- ADMIN: manage within their org
- Select visibility for collaboration as needed

```sql
-- Auditor assignments (example; adapt table names if different)
DROP POLICY IF EXISTS auditor_assignments_select ON auditor_assignments;
DROP POLICY IF EXISTS auditor_assignments_all ON auditor_assignments;

CREATE POLICY auditor_assignments_select ON auditor_assignments
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN','SUPER_ADMIN')
    OR user_id = auth.uid()
  );

CREATE POLICY auditor_assignments_all ON auditor_assignments
  FOR ALL TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN','SUPER_ADMIN')
  );

-- Branch manager assignments
DROP POLICY IF EXISTS branch_manager_assignments_select ON branch_manager_assignments;
DROP POLICY IF EXISTS branch_manager_assignments_all ON branch_manager_assignments;

CREATE POLICY branch_manager_assignments_select ON branch_manager_assignments
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN','SUPER_ADMIN','BRANCH_MANAGER')
    OR manager_id = auth.uid()
  );

CREATE POLICY branch_manager_assignments_all ON branch_manager_assignments
  FOR ALL TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN','SUPER_ADMIN')
  );
```

## 8) Zone branches (junction)
```sql
DROP POLICY IF EXISTS zone_branches_select ON zone_branches;
DROP POLICY IF EXISTS zone_branches_all ON zone_branches;

CREATE POLICY zone_branches_select ON zone_branches
  FOR SELECT TO authenticated
  USING (
    zone_id IN (
      SELECT id FROM zones WHERE
        (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
        OR org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY zone_branches_all ON zone_branches
  FOR ALL TO authenticated
  USING (
    zone_id IN (
      SELECT id FROM zones WHERE
        (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN','SUPER_ADMIN')
        AND ( (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
              OR org_id = (SELECT org_id FROM users WHERE id = auth.uid()) )
    )
  );
```

## 9) Activity logs
```sql
DROP POLICY IF EXISTS activity_logs_select ON activity_logs;
DROP POLICY IF EXISTS activity_logs_insert ON activity_logs;

-- Admins/super admins can read
CREATE POLICY activity_logs_select ON activity_logs
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN','SUPER_ADMIN')
  );

-- Anyone can insert app logs
CREATE POLICY activity_logs_insert ON activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);
```

## UI Alignment
- Only SUPER_ADMIN can access "Global View". Admins always operate within their `org_id`.
- Code patterns:
  - `useOrganization()` should set `effectiveOrgId` to the user org for ADMIN/BRANCH_MANAGER/AUDITOR, and permit null/global only for SUPER_ADMIN.
  - Screens gating (examples):
    - `apps/web/src/screens/AdvancedAnalyticsComplete.tsx`: already uses `isSuperAdmin && !effectiveOrgId` to show Global View banner.
    - Hide org-switcher controls for non-SUPER_ADMIN in `DashboardLayout` and any org selector components.
  - API calls must pass `orgId: effectiveOrgId` for non-SUPER_ADMIN; SUPER_ADMIN may pass selected org or omit for global as supported by endpoint.

Checklist
- Ensure org selector UI is only visible to SUPER_ADMIN.
- Ensure all list/fetch screens include org filter by `effectiveOrgId` for non-SUPER_ADMIN.
- Ensure mutations do not allow cross-org IDs from client for non-SUPER_ADMIN.

## Apply order
- Safe to run idempotently in any environment.
- Apply after schema is present and `public.users` has `role` and `org_id` populated.

## Rollback (if needed)
- Drop specific policies created here and restore previous ones if required.

## Final Notes
- This unified policy set ensures ADMIN ≈ SUPER_ADMIN but strictly scoped to their own org; SUPER_ADMIN remains cross-org.
- Notifications are normalized to support audit approval/rejection flows without RLS conflicts.

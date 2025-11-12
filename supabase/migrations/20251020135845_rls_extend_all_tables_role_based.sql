-- ============================================================================
-- RLS COMPREHENSIVE REFACTOR: All Core Tables
-- ============================================================================
-- Extends role-based access control to all core tables
-- Maintains original functionality while ensuring clean, minimal policies
-- ============================================================================

-- ====================
-- Drop existing policies on remaining tables
-- ====================

DO $$
DECLARE
  pol record;
BEGIN
  -- users
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
  END LOOP;

  -- branches
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'branches' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.branches', pol.policyname);
  END LOOP;

  -- zones
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'zones' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.zones', pol.policyname);
  END LOOP;

  -- zone_branches
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'zone_branches' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.zone_branches', pol.policyname);
  END LOOP;

  -- audits
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'audits' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.audits', pol.policyname);
  END LOOP;

  -- auditor_assignments
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'auditor_assignments' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.auditor_assignments', pol.policyname);
  END LOOP;

  -- audit_photos
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'audit_photos' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.audit_photos', pol.policyname);
  END LOOP;

  -- user_invitations
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'user_invitations' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_invitations', pol.policyname);
  END LOOP;

  -- activity_logs
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'activity_logs' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.activity_logs', pol.policyname);
  END LOOP;
END$$;

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS POLICIES
-- ============================================================================
-- SUPER_ADMIN: Full access to all users
-- ADMIN: Full access to users in own org
-- BRANCH_MANAGER: Read own org, update own profile
-- AUDITOR: Read own org, update own profile
-- ============================================================================

CREATE POLICY users_select_policy
ON public.users FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (u.role = 'SUPER_ADMIN' OR u.org_id = users.org_id)
  )
);

CREATE POLICY users_insert_policy
ON public.users FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER') AND u.org_id = users.org_id)
      )
  )
);

CREATE POLICY users_update_policy
ON public.users FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER') AND u.org_id = users.org_id)
        OR (u.id = users.id) -- Users can update own profile
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER') AND u.org_id = users.org_id)
        OR (u.id = users.id)
      )
  )
);

CREATE POLICY users_delete_policy
ON public.users FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role = 'ADMIN' AND u.org_id = users.org_id)
      )
  )
);

-- ============================================================================
-- BRANCHES POLICIES
-- ============================================================================
-- SUPER_ADMIN: Full access to all branches
-- ADMIN: Full access to branches in own org
-- BRANCH_MANAGER: Read own org, update own branch
-- AUDITOR: Read own org only
-- ============================================================================

CREATE POLICY branches_select_policy
ON public.branches FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (u.role = 'SUPER_ADMIN' OR u.org_id = branches.org_id)
  )
);

CREATE POLICY branches_insert_policy
ON public.branches FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER') AND u.org_id = branches.org_id)
      )
  )
);

CREATE POLICY branches_update_policy
ON public.branches FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role = 'ADMIN' AND u.org_id = branches.org_id)
        OR (u.role = 'BRANCH_MANAGER' AND u.branch_id = branches.id)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role = 'ADMIN' AND u.org_id = branches.org_id)
        OR (u.role = 'BRANCH_MANAGER' AND u.branch_id = branches.id)
      )
  )
);

CREATE POLICY branches_delete_policy
ON public.branches FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role = 'ADMIN' AND u.org_id = branches.org_id)
      )
  )
);

-- ============================================================================
-- ZONES POLICIES
-- ============================================================================
-- SUPER_ADMIN: Full access to all zones
-- ADMIN/BRANCH_MANAGER: Full access to zones in own org
-- AUDITOR: Read own org only
-- ============================================================================

CREATE POLICY zones_select_policy
ON public.zones FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (u.role = 'SUPER_ADMIN' OR u.org_id = zones.org_id)
  )
);

CREATE POLICY zones_insert_policy
ON public.zones FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER') AND u.org_id = zones.org_id)
      )
  )
);

CREATE POLICY zones_update_policy
ON public.zones FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER') AND u.org_id = zones.org_id)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER') AND u.org_id = zones.org_id)
      )
  )
);

CREATE POLICY zones_delete_policy
ON public.zones FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER') AND u.org_id = zones.org_id)
      )
  )
);

-- ============================================================================
-- ZONE_BRANCHES POLICIES (junction table follows zone access)
-- ============================================================================

CREATE POLICY zone_branches_select_policy
ON public.zone_branches FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.zones z ON z.id = zone_branches.zone_id
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (u.role = 'SUPER_ADMIN' OR u.org_id = z.org_id)
  )
);

CREATE POLICY zone_branches_insert_policy
ON public.zone_branches FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.zones z ON z.id = zone_branches.zone_id
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER') AND u.org_id = z.org_id)
      )
  )
);

CREATE POLICY zone_branches_update_policy
ON public.zone_branches FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.zones z ON z.id = zone_branches.zone_id
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER') AND u.org_id = z.org_id)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.zones z ON z.id = zone_branches.zone_id
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER') AND u.org_id = z.org_id)
      )
  )
);

CREATE POLICY zone_branches_delete_policy
ON public.zone_branches FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.zones z ON z.id = zone_branches.zone_id
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER') AND u.org_id = z.org_id)
      )
  )
);

-- ============================================================================
-- AUDITS POLICIES
-- ============================================================================
-- SUPER_ADMIN: Full access to all audits
-- ADMIN/BRANCH_MANAGER: Full access to audits in own org
-- AUDITOR: Can create/read/update audits assigned to them; BM can see branch audits
-- ============================================================================

CREATE POLICY audits_select_policy
ON public.audits FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR u.org_id = audits.org_id
        OR (u.role = 'AUDITOR' AND u.id = audits.assigned_to)
        OR (u.role = 'BRANCH_MANAGER' AND u.branch_id = audits.branch_id)
      )
  )
);

CREATE POLICY audits_insert_policy
ON public.audits FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER', 'AUDITOR') AND u.org_id = audits.org_id)
      )
  )
);

CREATE POLICY audits_update_policy
ON public.audits FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER') AND u.org_id = audits.org_id)
        OR (u.role = 'AUDITOR' AND u.id = audits.assigned_to)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER') AND u.org_id = audits.org_id)
        OR (u.role = 'AUDITOR' AND u.id = audits.assigned_to)
      )
  )
);

CREATE POLICY audits_delete_policy
ON public.audits FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER') AND u.org_id = audits.org_id)
      )
  )
);

-- ============================================================================
-- AUDITOR_ASSIGNMENTS POLICIES
-- ============================================================================
-- SUPER_ADMIN: Full access
-- ADMIN/BRANCH_MANAGER: Manage assignments in own org
-- AUDITOR: Read own assignment
-- ============================================================================

CREATE POLICY auditor_assignments_select_policy
ON public.auditor_assignments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.users assigned_user ON assigned_user.id = auditor_assignments.user_id
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER') AND u.org_id = assigned_user.org_id)
        OR u.id = auditor_assignments.user_id
      )
  )
);

CREATE POLICY auditor_assignments_insert_policy
ON public.auditor_assignments FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.users assigned_user ON assigned_user.id = auditor_assignments.user_id
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER') AND u.org_id = assigned_user.org_id)
      )
  )
);

CREATE POLICY auditor_assignments_update_policy
ON public.auditor_assignments FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.users assigned_user ON assigned_user.id = auditor_assignments.user_id
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER') AND u.org_id = assigned_user.org_id)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.users assigned_user ON assigned_user.id = auditor_assignments.user_id
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER') AND u.org_id = assigned_user.org_id)
      )
  )
);

CREATE POLICY auditor_assignments_delete_policy
ON public.auditor_assignments FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.users assigned_user ON assigned_user.id = auditor_assignments.user_id
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER') AND u.org_id = assigned_user.org_id)
      )
  )
);

-- ============================================================================
-- AUDIT_PHOTOS POLICIES (follows audit access)
-- ============================================================================

CREATE POLICY audit_photos_select_policy
ON public.audit_photos FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.audits a ON a.id = audit_photos.audit_id
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR u.org_id = a.org_id
        OR u.id = a.assigned_to
      )
  )
);

CREATE POLICY audit_photos_insert_policy
ON public.audit_photos FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.audits a ON a.id = audit_photos.audit_id
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER') AND u.org_id = a.org_id)
        OR (u.role = 'AUDITOR' AND u.id = a.assigned_to)
      )
  )
);

CREATE POLICY audit_photos_update_policy
ON public.audit_photos FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.audits a ON a.id = audit_photos.audit_id
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER') AND u.org_id = a.org_id)
        OR (u.role = 'AUDITOR' AND u.id = a.assigned_to)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.audits a ON a.id = audit_photos.audit_id
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER') AND u.org_id = a.org_id)
        OR (u.role = 'AUDITOR' AND u.id = a.assigned_to)
      )
  )
);

CREATE POLICY audit_photos_delete_policy
ON public.audit_photos FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.audits a ON a.id = audit_photos.audit_id
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER') AND u.org_id = a.org_id)
        OR (u.role = 'AUDITOR' AND u.id = a.assigned_to)
      )
  )
);

-- ============================================================================
-- USER_INVITATIONS POLICIES
-- ============================================================================
-- SUPER_ADMIN: Full access
-- ADMIN: Manage invitations for own org
-- Others: No access
-- ============================================================================

CREATE POLICY user_invitations_select_policy
ON public.user_invitations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role = 'ADMIN' AND u.org_id = user_invitations.org_id)
      )
  )
);

CREATE POLICY user_invitations_insert_policy
ON public.user_invitations FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role = 'ADMIN' AND u.org_id = user_invitations.org_id)
      )
  )
);

CREATE POLICY user_invitations_update_policy
ON public.user_invitations FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role = 'ADMIN' AND u.org_id = user_invitations.org_id)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role = 'ADMIN' AND u.org_id = user_invitations.org_id)
      )
  )
);

CREATE POLICY user_invitations_delete_policy
ON public.user_invitations FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role = 'ADMIN' AND u.org_id = user_invitations.org_id)
      )
  )
);

-- ============================================================================
-- ACTIVITY_LOGS POLICIES
-- ============================================================================
-- SUPER_ADMIN: Full access
-- ADMIN/BRANCH_MANAGER: Read own org
-- AUDITOR: No access (logs are for admin audit trail)
-- ============================================================================

CREATE POLICY activity_logs_select_policy
ON public.activity_logs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER') AND u.org_id = activity_logs.org_id)
      )
  )
);

CREATE POLICY activity_logs_insert_policy
ON public.activity_logs FOR INSERT TO authenticated
WITH CHECK (true); -- Allow all authenticated users to create logs

-- No UPDATE/DELETE on activity_logs (audit trail immutability);

-- ============================================================================
-- RLS CLEAN REFACTOR: Role-Based Access Control
-- ============================================================================
-- Drop all existing policies and create minimal, clean policy set
-- 
-- Role hierarchy:
-- - SUPER_ADMIN: Full access to all orgs (in ORG scope) or read-only (in ALL scope - handled client-side)
-- - ADMIN/BRANCH_MANAGER/AUDITOR: Full access to own org only
-- ============================================================================

-- ====================
-- PHASE 1: Drop existing policies
-- ====================

DO $$
DECLARE
  pol record;
BEGIN
  -- Drop all policies on organizations
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'organizations' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.organizations', pol.policyname);
  END LOOP;

  -- Drop all policies on surveys
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'surveys' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.surveys', pol.policyname);
  END LOOP;

  -- Drop all policies on survey_sections
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'survey_sections' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.survey_sections', pol.policyname);
  END LOOP;

  -- Drop all policies on survey_questions
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'survey_questions' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.survey_questions', pol.policyname);
  END LOOP;
END$$;

-- ====================
-- PHASE 2: Create clean policies
-- ====================

-- Ensure RLS is enabled
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ORGANIZATIONS POLICIES
-- ============================================================================

-- SELECT: SUPER_ADMIN sees all; others see only their org
CREATE POLICY organizations_select_policy
ON public.organizations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR u.org_id = organizations.id
      )
  )
);

-- INSERT: SUPER_ADMIN only
CREATE POLICY organizations_insert_policy
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND u.role = 'SUPER_ADMIN'
  )
);

-- UPDATE: SUPER_ADMIN all; ADMIN own org only
CREATE POLICY organizations_update_policy
ON public.organizations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER') AND u.org_id = organizations.id)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER') AND u.org_id = organizations.id)
      )
  )
);

-- DELETE: SUPER_ADMIN only
CREATE POLICY organizations_delete_policy
ON public.organizations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND u.role = 'SUPER_ADMIN'
  )
);

-- ============================================================================
-- SURVEYS POLICIES
-- ============================================================================

-- SELECT: SUPER_ADMIN sees all; others see only their org
CREATE POLICY surveys_select_policy
ON public.surveys
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR u.org_id = surveys.org_id
      )
  )
);

-- INSERT: SUPER_ADMIN anywhere; others only in own org
CREATE POLICY surveys_insert_policy
ON public.surveys
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER', 'AUDITOR') AND u.org_id = surveys.org_id)
      )
  )
);

-- UPDATE: SUPER_ADMIN anywhere; others only in own org
CREATE POLICY surveys_update_policy
ON public.surveys
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER', 'AUDITOR') AND u.org_id = surveys.org_id)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER', 'AUDITOR') AND u.org_id = surveys.org_id)
      )
  )
);

-- DELETE: SUPER_ADMIN anywhere; ADMIN only in own org
CREATE POLICY surveys_delete_policy
ON public.surveys
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER') AND u.org_id = surveys.org_id)
      )
  )
);

-- ============================================================================
-- SURVEY_SECTIONS POLICIES
-- ============================================================================

-- SELECT: SUPER_ADMIN sees all; others see only their org
CREATE POLICY survey_sections_select_policy
ON public.survey_sections
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.surveys s ON s.id = survey_sections.survey_id
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR u.org_id = s.org_id
      )
  )
);

-- INSERT: SUPER_ADMIN anywhere; others only in own org
CREATE POLICY survey_sections_insert_policy
ON public.survey_sections
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.surveys s ON s.id = survey_sections.survey_id
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER', 'AUDITOR') AND u.org_id = s.org_id)
      )
  )
);

-- UPDATE: SUPER_ADMIN anywhere; others only in own org
CREATE POLICY survey_sections_update_policy
ON public.survey_sections
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.surveys s ON s.id = survey_sections.survey_id
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER', 'AUDITOR') AND u.org_id = s.org_id)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.surveys s ON s.id = survey_sections.survey_id
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER', 'AUDITOR') AND u.org_id = s.org_id)
      )
  )
);

-- DELETE: SUPER_ADMIN anywhere; ADMIN only in own org
CREATE POLICY survey_sections_delete_policy
ON public.survey_sections
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.surveys s ON s.id = survey_sections.survey_id
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER') AND u.org_id = s.org_id)
      )
  )
);

-- ============================================================================
-- SURVEY_QUESTIONS POLICIES
-- ============================================================================

-- SELECT: SUPER_ADMIN sees all; others see only their org
CREATE POLICY survey_questions_select_policy
ON public.survey_questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.surveys s ON s.id = survey_questions.survey_id
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR u.org_id = s.org_id
      )
  )
);

-- INSERT: SUPER_ADMIN anywhere; others only in own org
CREATE POLICY survey_questions_insert_policy
ON public.survey_questions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.surveys s ON s.id = survey_questions.survey_id
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER', 'AUDITOR') AND u.org_id = s.org_id)
      )
  )
);

-- UPDATE: SUPER_ADMIN anywhere; others only in own org
CREATE POLICY survey_questions_update_policy
ON public.survey_questions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.surveys s ON s.id = survey_questions.survey_id
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER', 'AUDITOR') AND u.org_id = s.org_id)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.surveys s ON s.id = survey_questions.survey_id
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER', 'AUDITOR') AND u.org_id = s.org_id)
      )
  )
);

-- DELETE: SUPER_ADMIN anywhere; ADMIN only in own org
CREATE POLICY survey_questions_delete_policy
ON public.survey_questions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.surveys s ON s.id = survey_questions.survey_id
    WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
      AND (
        u.role = 'SUPER_ADMIN'
        OR (u.role IN ('ADMIN', 'BRANCH_MANAGER') AND u.org_id = s.org_id)
      )
  )
);;

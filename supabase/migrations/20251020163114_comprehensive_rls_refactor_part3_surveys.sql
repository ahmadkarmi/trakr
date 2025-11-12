-- ================================================
-- COMPREHENSIVE RLS REFACTOR - PART 3: SURVEYS
-- ================================================
-- Surveys, Survey Sections, Survey Questions
-- ================================================

-- ================================================
-- SURVEYS TABLE
-- ================================================

-- Drop existing policies
DROP POLICY IF EXISTS surveys_select_policy ON public.surveys;
DROP POLICY IF EXISTS surveys_insert_policy ON public.surveys;
DROP POLICY IF EXISTS surveys_update_policy ON public.surveys;
DROP POLICY IF EXISTS surveys_delete_policy ON public.surveys;

-- SELECT: Super admins see all, others see surveys in their org
CREATE POLICY surveys_select_policy
ON public.surveys
FOR SELECT
TO authenticated
USING (
  is_super_admin()
  OR org_id = current_user_org_id()
);

-- INSERT: Only super admins and admins can create surveys
CREATE POLICY surveys_insert_policy
ON public.surveys
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin()
  OR (is_admin_or_super() AND org_id = current_user_org_id())
);

-- UPDATE: Only super admins and admins can update surveys
CREATE POLICY surveys_update_policy
ON public.surveys
FOR UPDATE
TO authenticated
USING (
  is_super_admin()
  OR (is_admin_or_super() AND org_id = current_user_org_id())
)
WITH CHECK (
  is_super_admin()
  OR (is_admin_or_super() AND org_id = current_user_org_id())
);

-- DELETE: Only super admins and admins can delete surveys
CREATE POLICY surveys_delete_policy
ON public.surveys
FOR DELETE
TO authenticated
USING (
  is_super_admin()
  OR (is_admin_or_super() AND org_id = current_user_org_id())
);

-- ================================================
-- SURVEY_SECTIONS TABLE
-- ================================================

-- Drop existing policies
DROP POLICY IF EXISTS survey_sections_select_policy ON public.survey_sections;
DROP POLICY IF EXISTS survey_sections_insert_policy ON public.survey_sections;
DROP POLICY IF EXISTS survey_sections_update_policy ON public.survey_sections;
DROP POLICY IF EXISTS survey_sections_delete_policy ON public.survey_sections;

-- SELECT: Can see sections if can see parent survey
CREATE POLICY survey_sections_select_policy
ON public.survey_sections
FOR SELECT
TO authenticated
USING (
  is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.surveys s
    WHERE s.id = survey_sections.survey_id
      AND (s.org_id = current_user_org_id() OR is_super_admin())
  )
);

-- INSERT: Can insert sections if can edit parent survey
CREATE POLICY survey_sections_insert_policy
ON public.survey_sections
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.surveys s
    WHERE s.id = survey_sections.survey_id
      AND is_admin_or_super()
      AND s.org_id = current_user_org_id()
  )
);

-- UPDATE: Can update sections if can edit parent survey
CREATE POLICY survey_sections_update_policy
ON public.survey_sections
FOR UPDATE
TO authenticated
USING (
  is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.surveys s
    WHERE s.id = survey_sections.survey_id
      AND is_admin_or_super()
      AND s.org_id = current_user_org_id()
  )
)
WITH CHECK (
  is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.surveys s
    WHERE s.id = survey_sections.survey_id
      AND is_admin_or_super()
      AND s.org_id = current_user_org_id()
  )
);

-- DELETE: Can delete sections if can edit parent survey
CREATE POLICY survey_sections_delete_policy
ON public.survey_sections
FOR DELETE
TO authenticated
USING (
  is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.surveys s
    WHERE s.id = survey_sections.survey_id
      AND is_admin_or_super()
      AND s.org_id = current_user_org_id()
  )
);

-- ================================================
-- SURVEY_QUESTIONS TABLE
-- ================================================

-- Drop existing policies
DROP POLICY IF EXISTS survey_questions_select_policy ON public.survey_questions;
DROP POLICY IF EXISTS survey_questions_insert_policy ON public.survey_questions;
DROP POLICY IF EXISTS survey_questions_update_policy ON public.survey_questions;
DROP POLICY IF EXISTS survey_questions_delete_policy ON public.survey_questions;

-- SELECT: Can see questions if can see parent survey
CREATE POLICY survey_questions_select_policy
ON public.survey_questions
FOR SELECT
TO authenticated
USING (
  is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.surveys s
    WHERE s.id = survey_questions.survey_id
      AND (s.org_id = current_user_org_id() OR is_super_admin())
  )
);

-- INSERT: Can insert questions if can edit parent survey
CREATE POLICY survey_questions_insert_policy
ON public.survey_questions
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.surveys s
    WHERE s.id = survey_questions.survey_id
      AND is_admin_or_super()
      AND s.org_id = current_user_org_id()
  )
);

-- UPDATE: Can update questions if can edit parent survey
CREATE POLICY survey_questions_update_policy
ON public.survey_questions
FOR UPDATE
TO authenticated
USING (
  is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.surveys s
    WHERE s.id = survey_questions.survey_id
      AND is_admin_or_super()
      AND s.org_id = current_user_org_id()
  )
)
WITH CHECK (
  is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.surveys s
    WHERE s.id = survey_questions.survey_id
      AND is_admin_or_super()
      AND s.org_id = current_user_org_id()
  )
);

-- DELETE: Can delete questions if can edit parent survey
CREATE POLICY survey_questions_delete_policy
ON public.survey_questions
FOR DELETE
TO authenticated
USING (
  is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.surveys s
    WHERE s.id = survey_questions.survey_id
      AND is_admin_or_super()
      AND s.org_id = current_user_org_id()
  )
);
;

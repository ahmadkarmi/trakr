-- Ensure RLS is on
alter table public.organizations enable row level security;
alter table public.surveys enable row level security;
alter table public.survey_sections enable row level security;
alter table public.survey_questions enable row level security;

-- SUPER ADMIN can SELECT all organizations
DO $$
BEGIN
  CREATE POLICY "orgs_super_admin_all_select"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
        AND u.role = 'SUPER_ADMIN'
    )
  );
EXCEPTION WHEN duplicate_object THEN
  ALTER POLICY "orgs_super_admin_all_select" ON public.organizations
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
          AND u.role = 'SUPER_ADMIN'
      )
    );
END$$;

-- SUPER ADMIN can INSERT and UPDATE surveys anywhere
DO $$
BEGIN
  CREATE POLICY "surveys_super_admin_all_write"
  ON public.surveys
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
        AND u.role = 'SUPER_ADMIN'
    )
  );
EXCEPTION WHEN duplicate_object THEN
  ALTER POLICY "surveys_super_admin_all_write" ON public.surveys
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
          AND u.role = 'SUPER_ADMIN'
      )
    );
END$$;

DO $$
BEGIN
  CREATE POLICY "surveys_super_admin_all_update"
  ON public.surveys
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
        AND u.role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
        AND u.role = 'SUPER_ADMIN'
    )
  );
EXCEPTION WHEN duplicate_object THEN
  ALTER POLICY "surveys_super_admin_all_update" ON public.surveys
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
          AND u.role = 'SUPER_ADMIN'
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
          AND u.role = 'SUPER_ADMIN'
      )
    );
END$$;

-- SUPER ADMIN can INSERT sections anywhere
DO $$
BEGIN
  CREATE POLICY "survey_sections_super_admin_all_insert"
  ON public.survey_sections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
        AND u.role = 'SUPER_ADMIN'
    )
  );
EXCEPTION WHEN duplicate_object THEN
  ALTER POLICY "survey_sections_super_admin_all_insert" ON public.survey_sections
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
          AND u.role = 'SUPER_ADMIN'
      )
    );
END$$;

-- SUPER ADMIN can INSERT questions anywhere
DO $$
BEGIN
  CREATE POLICY "survey_questions_super_admin_all_insert"
  ON public.survey_questions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
        AND u.role = 'SUPER_ADMIN'
    )
  );
EXCEPTION WHEN duplicate_object THEN
  ALTER POLICY "survey_questions_super_admin_all_insert" ON public.survey_questions
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
          AND u.role = 'SUPER_ADMIN'
      )
    );
END$$;;

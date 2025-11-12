-- Production-grade RLS policies targeting authenticated users
-- Note: These are additive to existing dev anon policies. Remove dev policies before production cutover.

-- Grant execute on RPCs to authenticated (in addition to anon for dev)
DO $$ BEGIN
  IF to_regprocedure('public.submit_audit(uuid, uuid)') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.submit_audit(uuid, uuid) TO authenticated';
  END IF;
  IF to_regprocedure('public.set_audit_approval(uuid, text, uuid, text, text, text, text)') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.set_audit_approval(uuid, text, uuid, text, text, text, text) TO authenticated';
  END IF;
  IF to_regprocedure('public.set_audit_assigned_to(uuid, uuid)') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.set_audit_assigned_to(uuid, uuid) TO authenticated';
  END IF;
  IF to_regprocedure('public.reassign_unstarted_audits_for_branches(uuid[], uuid)') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.reassign_unstarted_audits_for_branches(uuid[], uuid) TO authenticated';
  END IF;
  IF to_regprocedure('public.reassign_open_audits_for_branch(uuid, uuid)') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.reassign_open_audits_for_branch(uuid, uuid) TO authenticated';
  END IF;
  IF to_regprocedure('public.set_auditor_assignment(uuid, uuid[], uuid[])') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.set_auditor_assignment(uuid, uuid[], uuid[]) TO authenticated';
  END IF;
END $$;

-- Helper predicates
-- user_org_match(table_org_id): true if current authenticated user's org matches given org id
CREATE OR REPLACE FUNCTION public._user_org_match(p_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_user_id = auth.uid() AND u.org_id = p_org_id
  );
$$;

-- user_is_admin_for_org(table_org_id): true if current user is ADMIN in given org
CREATE OR REPLACE FUNCTION public._user_is_admin_for_org(p_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_user_id = auth.uid() AND u.org_id = p_org_id AND u.role = 'ADMIN'
  );
$$;

-- Organizations
DROP POLICY IF EXISTS prod_select_orgs ON public.organizations;
CREATE POLICY prod_select_orgs ON public.organizations FOR SELECT TO authenticated
USING (public._user_org_match(id));

DROP POLICY IF EXISTS prod_update_orgs ON public.organizations;
CREATE POLICY prod_update_orgs ON public.organizations FOR UPDATE TO authenticated
USING (public._user_is_admin_for_org(id)) WITH CHECK (public._user_is_admin_for_org(id));

-- Users
DROP POLICY IF EXISTS prod_select_users ON public.users;
CREATE POLICY prod_select_users ON public.users FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users me WHERE me.auth_user_id = auth.uid() AND me.org_id = users.org_id
  )
);

DROP POLICY IF EXISTS prod_update_users_self ON public.users;
CREATE POLICY prod_update_users_self ON public.users FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users me WHERE me.auth_user_id = auth.uid() AND me.id = users.id
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users me WHERE me.auth_user_id = auth.uid() AND me.id = users.id
  )
);

DROP POLICY IF EXISTS prod_update_users_admin ON public.users;
CREATE POLICY prod_update_users_admin ON public.users FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users me WHERE me.auth_user_id = auth.uid() AND me.org_id = users.org_id AND me.role = 'ADMIN'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users me WHERE me.auth_user_id = auth.uid() AND me.org_id = users.org_id AND me.role = 'ADMIN'
  )
);

-- Branches
DROP POLICY IF EXISTS prod_select_branches ON public.branches;
CREATE POLICY prod_select_branches ON public.branches FOR SELECT TO authenticated
USING (public._user_org_match(org_id));

DROP POLICY IF EXISTS prod_write_branches ON public.branches;
CREATE POLICY prod_write_branches ON public.branches FOR ALL TO authenticated
USING (public._user_is_admin_for_org(org_id)) WITH CHECK (public._user_is_admin_for_org(org_id));

-- Zones
DROP POLICY IF EXISTS prod_select_zones ON public.zones;
CREATE POLICY prod_select_zones ON public.zones FOR SELECT TO authenticated
USING (public._user_org_match(org_id));

DROP POLICY IF EXISTS prod_write_zones ON public.zones;
CREATE POLICY prod_write_zones ON public.zones FOR ALL TO authenticated
USING (public._user_is_admin_for_org(org_id)) WITH CHECK (public._user_is_admin_for_org(org_id));

-- Zone branches
DROP POLICY IF EXISTS prod_select_zone_branches ON public.zone_branches;
CREATE POLICY prod_select_zone_branches ON public.zone_branches FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zones z
    JOIN public.users u ON u.auth_user_id = auth.uid()
    WHERE z.id = zone_branches.zone_id AND z.org_id = u.org_id
  )
);

DROP POLICY IF EXISTS prod_write_zone_branches ON public.zone_branches;
CREATE POLICY prod_write_zone_branches ON public.zone_branches FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zones z
    JOIN public.users u ON u.auth_user_id = auth.uid() AND u.role = 'ADMIN'
    WHERE z.id = zone_branches.zone_id AND z.org_id = u.org_id
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.zones z
    JOIN public.users u ON u.auth_user_id = auth.uid() AND u.role = 'ADMIN'
    WHERE z.id = zone_branches.zone_id AND z.org_id = u.org_id
  )
);

-- Surveys
DROP POLICY IF EXISTS prod_select_surveys ON public.surveys;
CREATE POLICY prod_select_surveys ON public.surveys FOR SELECT TO authenticated
USING (public._user_org_match(org_id));

DROP POLICY IF EXISTS prod_write_surveys ON public.surveys;
CREATE POLICY prod_write_surveys ON public.surveys FOR ALL TO authenticated
USING (public._user_is_admin_for_org(org_id)) WITH CHECK (public._user_is_admin_for_org(org_id));

-- Sections
DROP POLICY IF EXISTS prod_select_sections ON public.survey_sections;
CREATE POLICY prod_select_sections ON public.survey_sections FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.surveys s
    JOIN public.users u ON u.auth_user_id = auth.uid()
    WHERE s.id = survey_sections.survey_id AND s.org_id = u.org_id
  )
);

DROP POLICY IF EXISTS prod_write_sections ON public.survey_sections;
CREATE POLICY prod_write_sections ON public.survey_sections FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.surveys s
    JOIN public.users u ON u.auth_user_id = auth.uid() AND u.role = 'ADMIN'
    WHERE s.id = survey_sections.survey_id AND s.org_id = u.org_id
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.surveys s
    JOIN public.users u ON u.auth_user_id = auth.uid() AND u.role = 'ADMIN'
    WHERE s.id = survey_sections.survey_id AND s.org_id = u.org_id
  )
);

-- Questions
DROP POLICY IF EXISTS prod_select_questions ON public.survey_questions;
CREATE POLICY prod_select_questions ON public.survey_questions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.surveys s
    JOIN public.users u ON u.auth_user_id = auth.uid()
    WHERE s.id = survey_questions.survey_id AND s.org_id = u.org_id
  )
);

DROP POLICY IF EXISTS prod_write_questions ON public.survey_questions;
CREATE POLICY prod_write_questions ON public.survey_questions FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.surveys s
    JOIN public.users u ON u.auth_user_id = auth.uid() AND u.role = 'ADMIN'
    WHERE s.id = survey_questions.survey_id AND s.org_id = u.org_id
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.surveys s
    JOIN public.users u ON u.auth_user_id = auth.uid() AND u.role = 'ADMIN'
    WHERE s.id = survey_questions.survey_id AND s.org_id = u.org_id
  )
);

-- Audits
DROP POLICY IF EXISTS prod_select_audits ON public.audits;
CREATE POLICY prod_select_audits ON public.audits FOR SELECT TO authenticated
USING (public._user_org_match(org_id));

DROP POLICY IF EXISTS prod_update_audits ON public.audits;
CREATE POLICY prod_update_audits ON public.audits FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_user_id = auth.uid() AND u.org_id = audits.org_id AND u.role IN ('ADMIN','AUDITOR','BRANCH_MANAGER')
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_user_id = auth.uid() AND u.org_id = audits.org_id AND u.role IN ('ADMIN','AUDITOR','BRANCH_MANAGER')
  )
);

-- Activity logs
DROP POLICY IF EXISTS prod_select_activity_logs ON public.activity_logs;
CREATE POLICY prod_select_activity_logs ON public.activity_logs FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.users u WHERE u.auth_user_id = auth.uid() AND u.org_id = activity_logs.org_id
));

-- Zone assignments (manual mapping of auditors to zones)
DROP POLICY IF EXISTS prod_select_zone_assignments ON public.zone_assignments;
CREATE POLICY prod_select_zone_assignments ON public.zone_assignments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zones z
    JOIN public.users u ON u.auth_user_id = auth.uid()
    WHERE z.id = zone_assignments.zone_id AND z.org_id = u.org_id
  )
);

DROP POLICY IF EXISTS prod_write_zone_assignments ON public.zone_assignments;
CREATE POLICY prod_write_zone_assignments ON public.zone_assignments FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zones z
    JOIN public.users u ON u.auth_user_id = auth.uid() AND u.role = 'ADMIN'
    WHERE z.id = zone_assignments.zone_id AND z.org_id = u.org_id
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.zones z
    JOIN public.users u ON u.auth_user_id = auth.uid() AND u.role = 'ADMIN'
    WHERE z.id = zone_assignments.zone_id AND z.org_id = u.org_id
  )
);

-- Auditor branch assignments (cycle-bound)
DROP POLICY IF EXISTS prod_select_ab_assignments ON public.auditor_branch_assignments;
CREATE POLICY prod_select_ab_assignments ON public.auditor_branch_assignments FOR SELECT TO authenticated
USING (public._user_org_match(org_id));

DROP POLICY IF EXISTS prod_write_ab_assignments ON public.auditor_branch_assignments;
CREATE POLICY prod_write_ab_assignments ON public.auditor_branch_assignments FOR ALL TO authenticated
USING (public._user_is_admin_for_org(org_id)) WITH CHECK (public._user_is_admin_for_org(org_id));;

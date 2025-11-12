-- Restrict function EXECUTE to only the functions used by the app (anon)
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

DO $$ BEGIN
  IF to_regprocedure('public.submit_audit(uuid, uuid)') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.submit_audit(uuid, uuid) TO anon';
  END IF;
  IF to_regprocedure('public.set_audit_approval(uuid, text, uuid, text, text, text, text)') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.set_audit_approval(uuid, text, uuid, text, text, text, text) TO anon';
  END IF;
  IF to_regprocedure('public.set_audit_assigned_to(uuid, uuid)') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.set_audit_assigned_to(uuid, uuid) TO anon';
  END IF;
  IF to_regprocedure('public.reassign_unstarted_audits_for_branches(uuid[], uuid)') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.reassign_unstarted_audits_for_branches(uuid[], uuid) TO anon';
  END IF;
  IF to_regprocedure('public.reassign_open_audits_for_branch(uuid, uuid)') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.reassign_open_audits_for_branch(uuid, uuid) TO anon';
  END IF;
  IF to_regprocedure('public.set_auditor_assignment(uuid, uuid[], uuid[])') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.set_auditor_assignment(uuid, uuid[], uuid[]) TO anon';
  END IF;
  IF to_regprocedure('public.ensure_current_period_scheduling()') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.ensure_current_period_scheduling() TO anon';
  END IF;
END $$;

-- Make RLS policies explicit to role anon for dev
-- Core read policies (select) for anon
DO $$ BEGIN
  -- organizations
  BEGIN
    DROP POLICY IF EXISTS dev_select_orgs ON public.organizations;
    CREATE POLICY dev_select_orgs ON public.organizations FOR SELECT TO anon USING (true);
  EXCEPTION WHEN others THEN NULL; END;
  -- users
  BEGIN
    DROP POLICY IF EXISTS dev_select_users ON public.users;
    CREATE POLICY dev_select_users ON public.users FOR SELECT TO anon USING (true);
  EXCEPTION WHEN others THEN NULL; END;
  -- branches
  BEGIN
    DROP POLICY IF EXISTS dev_select_branches ON public.branches;
    CREATE POLICY dev_select_branches ON public.branches FOR SELECT TO anon USING (true);
  EXCEPTION WHEN others THEN NULL; END;
  -- zones
  BEGIN
    DROP POLICY IF EXISTS dev_select_zones ON public.zones;
    CREATE POLICY dev_select_zones ON public.zones FOR SELECT TO anon USING (true);
  EXCEPTION WHEN others THEN NULL; END;
  -- zone_branches
  BEGIN
    DROP POLICY IF EXISTS dev_select_zone_branches ON public.zone_branches;
    CREATE POLICY dev_select_zone_branches ON public.zone_branches FOR SELECT TO anon USING (true);
  EXCEPTION WHEN others THEN NULL; END;
  -- zone_assignments
  BEGIN
    DROP POLICY IF EXISTS dev_select_zone_assignments ON public.zone_assignments;
    CREATE POLICY dev_select_zone_assignments ON public.zone_assignments FOR SELECT TO anon USING (true);
  EXCEPTION WHEN others THEN NULL; END;
  -- auditor_branch_assignments
  BEGIN
    DROP POLICY IF EXISTS dev_select_auditor_branch_assignments ON public.auditor_branch_assignments;
    CREATE POLICY dev_select_auditor_branch_assignments ON public.auditor_branch_assignments FOR SELECT TO anon USING (true);
  EXCEPTION WHEN others THEN NULL; END;
  -- surveys & children
  BEGIN
    DROP POLICY IF EXISTS dev_select_surveys ON public.surveys;
    CREATE POLICY dev_select_surveys ON public.surveys FOR SELECT TO anon USING (true);
  EXCEPTION WHEN others THEN NULL; END;
  BEGIN
    DROP POLICY IF EXISTS dev_select_sections ON public.survey_sections;
    CREATE POLICY dev_select_sections ON public.survey_sections FOR SELECT TO anon USING (true);
  EXCEPTION WHEN others THEN NULL; END;
  BEGIN
    DROP POLICY IF EXISTS dev_select_questions ON public.survey_questions;
    CREATE POLICY dev_select_questions ON public.survey_questions FOR SELECT TO anon USING (true);
  EXCEPTION WHEN others THEN NULL; END;
  -- audits & logs
  BEGIN
    DROP POLICY IF EXISTS dev_select_audits ON public.audits;
    CREATE POLICY dev_select_audits ON public.audits FOR SELECT TO anon USING (true);
  EXCEPTION WHEN others THEN NULL; END;
  BEGIN
    DROP POLICY IF EXISTS dev_select_activity_logs ON public.activity_logs;
    CREATE POLICY dev_select_activity_logs ON public.activity_logs FOR SELECT TO anon USING (true);
  EXCEPTION WHEN others THEN NULL; END;
END $$;

-- Dev write policies (explicit to anon) for the tables we mutate from the client
DO $$ BEGIN
  -- zones
  BEGIN
    DROP POLICY IF EXISTS dev_ins_zones ON public.zones; CREATE POLICY dev_ins_zones ON public.zones FOR INSERT TO anon WITH CHECK (true);
    DROP POLICY IF EXISTS dev_upd_zones ON public.zones; CREATE POLICY dev_upd_zones ON public.zones FOR UPDATE TO anon USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS dev_del_zones ON public.zones; CREATE POLICY dev_del_zones ON public.zones FOR DELETE TO anon USING (true);
  EXCEPTION WHEN others THEN NULL; END;
  -- zone_branches (update via delete/insert pattern)
  BEGIN
    DROP POLICY IF EXISTS dev_ins_zone_branches ON public.zone_branches; CREATE POLICY dev_ins_zone_branches ON public.zone_branches FOR INSERT TO anon WITH CHECK (true);
    DROP POLICY IF EXISTS dev_upd_zone_branches ON public.zone_branches; CREATE POLICY dev_upd_zone_branches ON public.zone_branches FOR UPDATE TO anon USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS dev_del_zone_branches ON public.zone_branches; CREATE POLICY dev_del_zone_branches ON public.zone_branches FOR DELETE TO anon USING (true);
  EXCEPTION WHEN others THEN NULL; END;
  -- surveys & children
  BEGIN
    DROP POLICY IF EXISTS dev_ins_surveys ON public.surveys; CREATE POLICY dev_ins_surveys ON public.surveys FOR INSERT TO anon WITH CHECK (true);
    DROP POLICY IF EXISTS dev_upd_surveys ON public.surveys; CREATE POLICY dev_upd_surveys ON public.surveys FOR UPDATE TO anon USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS dev_del_surveys ON public.surveys; CREATE POLICY dev_del_surveys ON public.surveys FOR DELETE TO anon USING (true);
  EXCEPTION WHEN others THEN NULL; END;
  BEGIN
    DROP POLICY IF EXISTS dev_ins_sections ON public.survey_sections; CREATE POLICY dev_ins_sections ON public.survey_sections FOR INSERT TO anon WITH CHECK (true);
    DROP POLICY IF EXISTS dev_upd_sections ON public.survey_sections; CREATE POLICY dev_upd_sections ON public.survey_sections FOR UPDATE TO anon USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS dev_del_sections ON public.survey_sections; CREATE POLICY dev_del_sections ON public.survey_sections FOR DELETE TO anon USING (true);
  EXCEPTION WHEN others THEN NULL; END;
  BEGIN
    DROP POLICY IF EXISTS dev_ins_questions ON public.survey_questions; CREATE POLICY dev_ins_questions ON public.survey_questions FOR INSERT TO anon WITH CHECK (true);
    DROP POLICY IF EXISTS dev_upd_questions ON public.survey_questions; CREATE POLICY dev_upd_questions ON public.survey_questions FOR UPDATE TO anon USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS dev_del_questions ON public.survey_questions; CREATE POLICY dev_del_questions ON public.survey_questions FOR DELETE TO anon USING (true);
  EXCEPTION WHEN others THEN NULL; END;
  -- users
  BEGIN
    DROP POLICY IF EXISTS dev_upd_users ON public.users; CREATE POLICY dev_upd_users ON public.users FOR UPDATE TO anon USING (true) WITH CHECK (true);
  EXCEPTION WHEN others THEN NULL; END;
  -- organizations
  BEGIN
    DROP POLICY IF EXISTS dev_upd_orgs ON public.organizations; CREATE POLICY dev_upd_orgs ON public.organizations FOR UPDATE TO anon USING (true) WITH CHECK (true);
  EXCEPTION WHEN others THEN NULL; END;
  -- assignments
  BEGIN
    DROP POLICY IF EXISTS dev_ins_assignments ON public.auditor_branch_assignments; CREATE POLICY dev_ins_assignments ON public.auditor_branch_assignments FOR INSERT TO anon WITH CHECK (true);
    DROP POLICY IF EXISTS dev_del_assignments ON public.auditor_branch_assignments; CREATE POLICY dev_del_assignments ON public.auditor_branch_assignments FOR DELETE TO anon USING (true);
  EXCEPTION WHEN others THEN NULL; END;
  BEGIN
    DROP POLICY IF EXISTS dev_ins_zone_assignments ON public.zone_assignments; CREATE POLICY dev_ins_zone_assignments ON public.zone_assignments FOR INSERT TO anon WITH CHECK (true);
    DROP POLICY IF EXISTS dev_del_zone_assignments ON public.zone_assignments; CREATE POLICY dev_del_zone_assignments ON public.zone_assignments FOR DELETE TO anon USING (true);
  EXCEPTION WHEN others THEN NULL; END;
  -- audits (we update status/assigned_to via RPC but permit direct update in dev)
  BEGIN
    DROP POLICY IF EXISTS dev_upd_audits ON public.audits; CREATE POLICY dev_upd_audits ON public.audits FOR UPDATE TO anon USING (true) WITH CHECK (true);
  EXCEPTION WHEN others THEN NULL; END;
END $$;

-- Create Storage bucket and dev policies for profile media
DO $$ BEGIN
  BEGIN
    PERFORM storage.create_bucket('profile-media', true);
  EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- Storage RLS policies (explicit to anon) for avatars and signatures paths
DO $$ BEGIN
  BEGIN
    DROP POLICY IF EXISTS dev_profile_media_read ON storage.objects;
    CREATE POLICY dev_profile_media_read ON storage.objects FOR SELECT TO anon USING (
      bucket_id = 'profile-media' AND (name LIKE 'avatars/%' OR name LIKE 'signatures/%')
    );
  EXCEPTION WHEN others THEN NULL; END;
  BEGIN
    DROP POLICY IF EXISTS dev_profile_media_insert ON storage.objects;
    CREATE POLICY dev_profile_media_insert ON storage.objects FOR INSERT TO anon WITH CHECK (
      bucket_id = 'profile-media' AND (name LIKE 'avatars/%' OR name LIKE 'signatures/%')
    );
  EXCEPTION WHEN others THEN NULL; END;
  BEGIN
    DROP POLICY IF EXISTS dev_profile_media_update ON storage.objects;
    CREATE POLICY dev_profile_media_update ON storage.objects FOR UPDATE TO anon USING (
      bucket_id = 'profile-media' AND (name LIKE 'avatars/%' OR name LIKE 'signatures/%')
    ) WITH CHECK (
      bucket_id = 'profile-media' AND (name LIKE 'avatars/%' OR name LIKE 'signatures/%')
    );
  EXCEPTION WHEN others THEN NULL; END;
  BEGIN
    DROP POLICY IF EXISTS dev_profile_media_delete ON storage.objects;
    CREATE POLICY dev_profile_media_delete ON storage.objects FOR DELETE TO anon USING (
      bucket_id = 'profile-media' AND (name LIKE 'avatars/%' OR name LIKE 'signatures/%')
    );
  EXCEPTION WHEN others THEN NULL; END;
END $$;;

-- 1) Harden RPC functions: set search_path=public and SECURITY DEFINER
DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT p.oid, n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'set_auditor_assignment',
        'set_audit_assigned_to',
        'reassign_open_audits_for_branch',
        'reassign_unstarted_audits_for_branches',
        'reassign_unstarted_audits_for_branch',
        'submit_audit',
        'set_audit_approval',
        'save_audit_progress',
        'admin_edit_audit',
        'ensure_current_period_scheduling',
        'current_period_range',
        'is_dev_mode',
        '_user_org_match',
        '_user_is_admin_for_org'
      )
  ) LOOP
    EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', r.nspname, r.proname, r.args);
    EXECUTE format('ALTER FUNCTION %I.%I(%s) SECURITY DEFINER', r.nspname, r.proname, r.args);
  END LOOP;
END$$;

-- 2) Add covering indexes for common foreign keys (no CONCURRENTLY inside migration)
-- activity_logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_org_id ON public.activity_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);

-- audit_photos
CREATE INDEX IF NOT EXISTS idx_audit_photos_audit_id ON public.audit_photos(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_photos_uploaded_by ON public.audit_photos(uploaded_by);

-- auditor_branch_assignments
CREATE INDEX IF NOT EXISTS idx_aba_org_id ON public.auditor_branch_assignments(org_id);
CREATE INDEX IF NOT EXISTS idx_aba_branch_id ON public.auditor_branch_assignments(branch_id);
CREATE INDEX IF NOT EXISTS idx_aba_user_id ON public.auditor_branch_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_aba_created_by ON public.auditor_branch_assignments(created_by);

-- audits
CREATE INDEX IF NOT EXISTS idx_audits_org_id ON public.audits(org_id);
CREATE INDEX IF NOT EXISTS idx_audits_branch_id ON public.audits(branch_id);
CREATE INDEX IF NOT EXISTS idx_audits_assigned_to ON public.audits(assigned_to);
CREATE INDEX IF NOT EXISTS idx_audits_survey_id ON public.audits(survey_id);
CREATE INDEX IF NOT EXISTS idx_audits_submitted_by ON public.audits(submitted_by);
CREATE INDEX IF NOT EXISTS idx_audits_approved_by ON public.audits(approved_by);
CREATE INDEX IF NOT EXISTS idx_audits_rejected_by ON public.audits(rejected_by);
CREATE INDEX IF NOT EXISTS idx_audits_status ON public.audits(status);
CREATE INDEX IF NOT EXISTS idx_audits_period ON public.audits(period_start, period_end);

-- branches
CREATE INDEX IF NOT EXISTS idx_branches_org_id ON public.branches(org_id);
CREATE INDEX IF NOT EXISTS idx_branches_manager_id ON public.branches(manager_id);

-- zones and linking tables
CREATE INDEX IF NOT EXISTS idx_zones_org_id ON public.zones(org_id);
CREATE INDEX IF NOT EXISTS idx_zone_branches_zone_id ON public.zone_branches(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_branches_branch_id ON public.zone_branches(branch_id);
CREATE INDEX IF NOT EXISTS idx_zone_assignments_zone_id ON public.zone_assignments(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_assignments_user_id ON public.zone_assignments(user_id);

-- surveys and related
CREATE INDEX IF NOT EXISTS idx_surveys_org_id ON public.surveys(org_id);
CREATE INDEX IF NOT EXISTS idx_survey_sections_survey_id ON public.survey_sections(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_questions_section_id ON public.survey_questions(section_id);

-- users
CREATE INDEX IF NOT EXISTS idx_users_org_id ON public.users(org_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
;

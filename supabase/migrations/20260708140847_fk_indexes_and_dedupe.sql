-- ============================================================================
-- Add indexes for all 21 unindexed foreign keys flagged by the Supabase
-- performance advisor, prioritizing `audits` (the hottest table — every
-- dashboard and audit view touches it). Also drop 5 pairs of byte-identical
-- duplicate indexes (confirmed via pg_indexes — same USING clause, same
-- column) found alongside them.
--
-- Not using CONCURRENTLY: these tables are small (low-traffic app, audits
-- table is largely test/demo data today), so a brief lock during plain
-- CREATE INDEX is an acceptable tradeoff against CONCURRENTLY's requirement
-- of running outside a transaction block, which this migration runner may
-- not guarantee.
-- ============================================================================

-- audits (hottest table — 5 FKs)
CREATE INDEX IF NOT EXISTS idx_audits_approved_by ON public.audits (approved_by);
CREATE INDEX IF NOT EXISTS idx_audits_assigned_to ON public.audits (assigned_to);
CREATE INDEX IF NOT EXISTS idx_audits_rejected_by ON public.audits (rejected_by);
CREATE INDEX IF NOT EXISTS idx_audits_submitted_by ON public.audits (submitted_by);
CREATE INDEX IF NOT EXISTS idx_audits_survey_id ON public.audits (survey_id);

-- audit_photos
CREATE INDEX IF NOT EXISTS idx_audit_photos_audit_id ON public.audit_photos (audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_photos_uploaded_by ON public.audit_photos (uploaded_by);

-- auditor_branch_assignments
CREATE INDEX IF NOT EXISTS idx_aba_branch_id ON public.auditor_branch_assignments (branch_id);
CREATE INDEX IF NOT EXISTS idx_aba_created_by ON public.auditor_branch_assignments (created_by);
CREATE INDEX IF NOT EXISTS idx_aba_org_id ON public.auditor_branch_assignments (org_id);
CREATE INDEX IF NOT EXISTS idx_aba_user_id ON public.auditor_branch_assignments (user_id);

-- branch_manager_assignments / branches
CREATE INDEX IF NOT EXISTS idx_bma_assigned_by ON public.branch_manager_assignments (assigned_by);
CREATE INDEX IF NOT EXISTS idx_branches_manager_id ON public.branches (manager_id);

-- data_access_audit
CREATE INDEX IF NOT EXISTS idx_data_access_audit_org_id ON public.data_access_audit (org_id);
CREATE INDEX IF NOT EXISTS idx_data_access_audit_user_id ON public.data_access_audit (user_id);

-- survey_questions / user_invitations
CREATE INDEX IF NOT EXISTS idx_survey_questions_section_id ON public.survey_questions (section_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_invited_by ON public.user_invitations (invited_by);

-- zone_assignments
CREATE INDEX IF NOT EXISTS idx_zone_assignments_created_by ON public.zone_assignments (created_by);
CREATE INDEX IF NOT EXISTS idx_zone_assignments_org_id ON public.zone_assignments (org_id);
CREATE INDEX IF NOT EXISTS idx_zone_assignments_user_id ON public.zone_assignments (user_id);
CREATE INDEX IF NOT EXISTS idx_zone_assignments_zone_id ON public.zone_assignments (zone_id);

-- ----------------------------------------------------------------------------
-- Drop byte-identical duplicate indexes (kept name noted per pair)
-- ----------------------------------------------------------------------------

-- auditor_assignments: keep the plain names (branch_ids one is the confirmed
-- actively-used index per advisor stats), drop the _gin-suffixed duplicates
DROP INDEX IF EXISTS public.idx_auditor_assignments_branch_ids_gin;
DROP INDEX IF EXISTS public.idx_auditor_assignments_zone_ids_gin;

-- surveys: keep the one matching the column name precisely
DROP INDEX IF EXISTS public.idx_surveys_applicable_branches;

-- zone_branches: keep the _id-suffixed names (precisely indicate the FK column)
DROP INDEX IF EXISTS public.idx_zone_branches_branch;
DROP INDEX IF EXISTS public.idx_zone_branches_zone;

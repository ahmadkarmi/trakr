-- ============================================================================
-- RPC EXECUTE grants: authenticated + service_role only.
-- The prior revoke targeted only `anon`, but these functions carry the
-- default PUBLIC grant, which anon inherits. Revoke from PUBLIC and grant
-- back explicitly. Predicate helpers keep PUBLIC EXECUTE deliberately:
-- they are evaluated inside RLS policies on tables with public read paths
-- (e.g. app_config pre-login dev_mode check).
-- ============================================================================
DO $$
DECLARE fn regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'create_audit_with_cycle_guard','ensure_current_period_scheduling',
        'reassign_open_audits_for_branch','reassign_unstarted_audits_for_branches',
        'set_audit_approval','set_audit_assigned_to','set_auditor_assignment',
        'set_org_config','submit_audit','log_data_access',
        'validate_rls_for_current_user','handle_new_user'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn);
  END LOOP;
END $$;

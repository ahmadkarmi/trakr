-- ============================================================================
-- Phase 6: replace N+1 client-side loops with single-round-trip RPCs.
--
-- reassign_open_audits_for_branches: mirrors the existing sibling
-- reassign_unstarted_audits_for_branches (FOREACH ... LOOP over the
-- already-defined per-branch function), collapsing what the client used to
-- do as N sequential RPC calls into one.
--
-- remove_branch_from_auditor_assignments / remove_zone_from_auditor_assignments:
-- replace the "select all assignments containing this id, then N individual
-- per-row updates" pattern in deleteBranch/deleteZone with a single
-- array_remove()-based UPDATE.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reassign_open_audits_for_branches(
  p_branch_ids uuid[],
  p_to_user uuid
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE total int := 0; bid uuid;
BEGIN
  FOREACH bid IN ARRAY p_branch_ids LOOP
    total := total + public.reassign_open_audits_for_branch(bid, p_to_user);
  END LOOP;
  RETURN total;
END;$$;

CREATE OR REPLACE FUNCTION public.remove_branch_from_auditor_assignments(
  p_branch_id uuid
) RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.auditor_assignments
     SET branch_ids = array_remove(branch_ids, p_branch_id),
         updated_at = now()
   WHERE branch_ids @> ARRAY[p_branch_id];
$$;

CREATE OR REPLACE FUNCTION public.remove_zone_from_auditor_assignments(
  p_zone_id uuid
) RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.auditor_assignments
     SET zone_ids = array_remove(zone_ids, p_zone_id),
         updated_at = now()
   WHERE zone_ids @> ARRAY[p_zone_id];
$$;

-- Match the project's established RPC grant posture: authenticated + service_role only.
DO $$
DECLARE fn regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'reassign_open_audits_for_branches',
        'remove_branch_from_auditor_assignments',
        'remove_zone_from_auditor_assignments'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn);
  END LOOP;
END $$;

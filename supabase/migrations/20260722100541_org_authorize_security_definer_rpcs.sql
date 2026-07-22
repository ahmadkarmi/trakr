-- These SECURITY DEFINER RPCs (RLS-bypassing, granted to authenticated, callable
-- via PostgREST) performed NO org-authorization: a user in org A could reassign/
-- submit org B's audits and rewrite org B users' branch/zone assignments. Add
-- org + role guards mirroring create_audit_with_cycle_guard, derive submit_audit's
-- submitter from auth.uid(), and pin search_path on the three that lacked it.
-- Verified with role-switched rollback transactions (cross-org blocked, in-org
-- allowed, assigned-auditor submit allowed, non-assignee submit blocked).

CREATE OR REPLACE FUNCTION public.reassign_open_audits_for_branch(p_branch_id uuid, p_to_user uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE v_count integer;
BEGIN
  IF NOT public.is_admin_or_super() THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
  IF NOT public.is_super_admin() AND (
       (SELECT org_id FROM public.branches WHERE id=p_branch_id) IS DISTINCT FROM public.current_user_org_id()
       OR (SELECT org_id FROM public.users WHERE id=p_to_user) IS DISTINCT FROM public.current_user_org_id()) THEN
    RAISE EXCEPTION 'Cross-org reassignment denied' USING ERRCODE='42501';
  END IF;
  UPDATE public.audits SET assigned_to=p_to_user, updated_at=now()
   WHERE branch_id=p_branch_id AND is_archived=false AND status IN ('DRAFT','IN_PROGRESS','REJECTED');
  GET DIAGNOSTICS v_count=ROW_COUNT; RETURN COALESCE(v_count,0);
END $fn$;

CREATE OR REPLACE FUNCTION public.reassign_open_audits_for_branches(p_branch_ids uuid[], p_to_user uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE total int := 0; bid uuid;
BEGIN
  IF NOT public.is_admin_or_super() THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
  FOREACH bid IN ARRAY COALESCE(p_branch_ids, ARRAY[]::uuid[]) LOOP
    total := total + public.reassign_open_audits_for_branch(bid, p_to_user); -- inner enforces per-branch org
  END LOOP;
  RETURN total;
END $fn$;

CREATE OR REPLACE FUNCTION public.reassign_unstarted_audits_for_branches(p_branch_ids uuid[], p_to_user uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE v_count integer;
BEGIN
  IF NOT public.is_admin_or_super() THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
  IF NOT public.is_super_admin() AND (
       EXISTS (SELECT 1 FROM public.branches WHERE id = ANY(COALESCE(p_branch_ids, ARRAY[]::uuid[])) AND org_id IS DISTINCT FROM public.current_user_org_id())
       OR (SELECT org_id FROM public.users WHERE id=p_to_user) IS DISTINCT FROM public.current_user_org_id()) THEN
    RAISE EXCEPTION 'Cross-org reassignment denied' USING ERRCODE='42501';
  END IF;
  UPDATE public.audits SET assigned_to=p_to_user, updated_at=now()
   WHERE branch_id = ANY(COALESCE(p_branch_ids, ARRAY[]::uuid[])) AND is_archived=false AND status='DRAFT';
  GET DIAGNOSTICS v_count=ROW_COUNT; RETURN COALESCE(v_count,0);
END $fn$;

CREATE OR REPLACE FUNCTION public.set_audit_assigned_to(p_audit_id uuid, p_to_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
BEGIN
  IF NOT public.is_admin_or_super() THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
  IF NOT public.is_super_admin() AND (
       (SELECT org_id FROM public.audits WHERE id=p_audit_id) IS DISTINCT FROM public.current_user_org_id()
       OR (SELECT org_id FROM public.users WHERE id=p_to_user) IS DISTINCT FROM public.current_user_org_id()) THEN
    RAISE EXCEPTION 'Cross-org reassignment denied' USING ERRCODE='42501';
  END IF;
  UPDATE public.audits SET assigned_to=p_to_user, updated_at=now()
   WHERE id=p_audit_id AND is_archived=false AND status IN ('DRAFT','IN_PROGRESS','REJECTED');
END $fn$;

CREATE OR REPLACE FUNCTION public.set_auditor_assignment(p_user_id uuid, p_branch_ids uuid[], p_zone_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
BEGIN
  IF NOT public.is_admin_or_super() THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
  IF NOT public.is_super_admin() AND (
       (SELECT org_id FROM public.users WHERE id=p_user_id) IS DISTINCT FROM public.current_user_org_id()
       OR EXISTS (SELECT 1 FROM public.branches WHERE id = ANY(COALESCE(p_branch_ids, ARRAY[]::uuid[])) AND org_id IS DISTINCT FROM public.current_user_org_id())
       OR EXISTS (SELECT 1 FROM public.zones WHERE id = ANY(COALESCE(p_zone_ids, ARRAY[]::uuid[])) AND org_id IS DISTINCT FROM public.current_user_org_id())) THEN
    RAISE EXCEPTION 'Cross-org assignment denied' USING ERRCODE='42501';
  END IF;
  DELETE FROM public.zone_assignments WHERE user_id = p_user_id;
  INSERT INTO public.zone_assignments (id, created_at, created_by, org_id, user_id, zone_id)
  SELECT gen_random_uuid(), now(), p_user_id, u.org_id, p_user_id, z_id
  FROM public.users u, unnest(COALESCE(p_zone_ids, ARRAY[]::uuid[])) AS z_id WHERE u.id = p_user_id;
  DELETE FROM public.auditor_branch_assignments WHERE user_id = p_user_id;
  INSERT INTO public.auditor_branch_assignments (id, created_at, created_by, org_id, user_id, branch_id, period_start, period_end)
  SELECT gen_random_uuid(), now(), p_user_id, u.org_id, p_user_id, b_id,
         date_trunc('day', now())::timestamptz, (now() + interval '90 days')
  FROM public.users u, unnest(COALESCE(p_branch_ids, ARRAY[]::uuid[])) AS b_id WHERE u.id = p_user_id;
END $fn$;

CREATE OR REPLACE FUNCTION public.remove_branch_from_auditor_assignments(p_branch_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
BEGIN
  IF NOT public.is_admin_or_super() THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
  UPDATE public.auditor_assignments SET branch_ids=array_remove(branch_ids,p_branch_id), updated_at=now()
   WHERE branch_ids @> ARRAY[p_branch_id] AND (public.is_super_admin() OR org_id = public.current_user_org_id());
END $fn$;

CREATE OR REPLACE FUNCTION public.remove_zone_from_auditor_assignments(p_zone_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
BEGIN
  IF NOT public.is_admin_or_super() THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
  UPDATE public.auditor_assignments SET zone_ids=array_remove(zone_ids,p_zone_id), updated_at=now()
   WHERE zone_ids @> ARRAY[p_zone_id] AND (public.is_super_admin() OR org_id = public.current_user_org_id());
END $fn$;

CREATE OR REPLACE FUNCTION public.submit_audit(p_audit_id uuid, p_submitted_by uuid)
RETURNS audits LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
declare v_audit public.audits; v_result public.audits; v_now timestamptz := timezone('utc', now());
begin
  select * into v_audit from public.audits where id = p_audit_id;
  if not found then raise exception 'Audit % not found', p_audit_id using errcode='P0002'; end if;
  if not public.is_super_admin() then
    if v_audit.org_id is distinct from public.current_user_org_id() then
      raise exception 'Not authorized for this audit' using errcode='42501';
    end if;
    if not (public.is_admin_or_super() or v_audit.assigned_to = public.current_user_id()) then
      raise exception 'Only the assigned auditor or an admin can submit this audit' using errcode='42501';
    end if;
  end if;
  update public.audits
     set status='SUBMITTED',
         submitted_by = coalesce(public.current_user_id(), p_submitted_by, submitted_by),
         submitted_at = v_now, updated_at = v_now
   where id = p_audit_id and status in ('DRAFT','IN_PROGRESS','COMPLETED')
  returning * into v_result;
  if not found then v_result := v_audit; end if;
  return v_result;
end $fn$;

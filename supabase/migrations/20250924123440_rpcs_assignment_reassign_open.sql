-- RPC: set_auditor_assignment consolidates manual per-cycle branches and zone assignments
create or replace function public.set_auditor_assignment(
  p_user_id uuid,
  p_branch_ids uuid[],
  p_zone_ids uuid[]
) returns void language plpgsql security definer as $$
DECLARE v_user public.users; v_org uuid; v_period record;
BEGIN
  SELECT * INTO v_user FROM public.users WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found: %', p_user_id; END IF;
  v_org := v_user.org_id;
  -- Resolve current period (default weekly for now)
  SELECT * INTO v_period FROM public.current_period_range(v_org, 'WEEKLY');

  -- Replace manual branch assignments for this user and period
  DELETE FROM public.auditor_branch_assignments
   WHERE org_id = v_org AND user_id = p_user_id AND period_start = v_period.period_start;

  IF array_length(p_branch_ids, 1) IS NOT NULL THEN
    INSERT INTO public.auditor_branch_assignments (org_id, user_id, branch_id, period_start, period_end, created_by)
    SELECT v_org, p_user_id, b_id, v_period.period_start, v_period.period_end, p_user_id
    FROM unnest(p_branch_ids) AS b_id;
  END IF;

  -- Replace zone assignments for this user
  DELETE FROM public.zone_assignments WHERE org_id = v_org AND user_id = p_user_id;
  IF array_length(p_zone_ids, 1) IS NOT NULL THEN
    INSERT INTO public.zone_assignments (org_id, zone_id, user_id, created_by)
    SELECT v_org, z_id, p_user_id, p_user_id FROM unnest(p_zone_ids) AS z_id;
  END IF;
END;$$;

-- RPC: reassign_open_audits_for_branch (Draft/In-Progress/Rejected)
create or replace function public.reassign_open_audits_for_branch(
  p_branch_id uuid,
  p_to_user uuid
) returns integer language plpgsql security definer as $$
DECLARE cnt int := 0;
BEGIN
  UPDATE public.audits
     SET assigned_to = p_to_user,
         updated_at = now()
   WHERE branch_id = p_branch_id
     AND status IN ('DRAFT','IN_PROGRESS','REJECTED')
     AND is_archived = false;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  RETURN cnt;
END;$$;;

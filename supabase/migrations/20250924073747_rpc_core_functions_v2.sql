-- Ensure pgcrypto for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop prior versions to avoid return type conflicts
DROP FUNCTION IF EXISTS public.set_auditor_assignment(uuid, uuid[], uuid[]);
DROP FUNCTION IF EXISTS public.set_audit_assigned_to(uuid, uuid);
DROP FUNCTION IF EXISTS public.reassign_open_audits_for_branch(uuid, uuid);
DROP FUNCTION IF EXISTS public.reassign_unstarted_audits_for_branches(uuid[], uuid);
DROP FUNCTION IF EXISTS public.submit_audit(uuid, uuid);
DROP FUNCTION IF EXISTS public.set_audit_approval(uuid, text, uuid, text, text, text, text);

-- Set auditor assignment: replace zone assignments and manual branch assignments for the user
CREATE FUNCTION public.set_auditor_assignment(
  p_user_id uuid,
  p_branch_ids uuid[],
  p_zone_ids uuid[]
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Replace zone assignments
  DELETE FROM public.zone_assignments WHERE user_id = p_user_id;
  INSERT INTO public.zone_assignments (id, created_at, created_by, org_id, user_id, zone_id)
  SELECT gen_random_uuid(), now(), p_user_id, u.org_id, p_user_id, z_id
  FROM public.users u, unnest(COALESCE(p_zone_ids, ARRAY[]::uuid[])) AS z_id
  WHERE u.id = p_user_id;

  -- Replace manual branch assignments (active window)
  DELETE FROM public.auditor_branch_assignments WHERE user_id = p_user_id;
  INSERT INTO public.auditor_branch_assignments (id, created_at, created_by, org_id, user_id, branch_id, period_start, period_end)
  SELECT gen_random_uuid(), now(), p_user_id, u.org_id, p_user_id, b_id,
         date_trunc('day', now())::timestamptz,
         (now() + interval '90 days')
  FROM public.users u, unnest(COALESCE(p_branch_ids, ARRAY[]::uuid[])) AS b_id
  WHERE u.id = p_user_id;
END;
$$;

-- Set audit assignee for open (non-archived, open-status) audits
CREATE FUNCTION public.set_audit_assigned_to(
  p_audit_id uuid,
  p_to_user uuid
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.audits
     SET assigned_to = p_to_user,
         updated_at = now()
   WHERE id = p_audit_id
     AND is_archived = false
     AND status IN ('DRAFT','IN_PROGRESS','REJECTED');
END;
$$;

-- Reassign open audits for a branch
CREATE FUNCTION public.reassign_open_audits_for_branch(
  p_branch_id uuid,
  p_to_user uuid
) RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.audits
     SET assigned_to = p_to_user,
         updated_at = now()
   WHERE branch_id = p_branch_id
     AND is_archived = false
     AND status IN ('DRAFT','IN_PROGRESS','REJECTED');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Reassign only DRAFT audits across multiple branches
CREATE FUNCTION public.reassign_unstarted_audits_for_branches(
  p_branch_ids uuid[],
  p_to_user uuid
) RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.audits
     SET assigned_to = p_to_user,
         updated_at = now()
   WHERE branch_id = ANY(COALESCE(p_branch_ids, ARRAY[]::uuid[]))
     AND is_archived = false
     AND status = 'DRAFT';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Submit audit for approval (assignee or admin only; only from IN_PROGRESS or COMPLETED)
CREATE FUNCTION public.submit_audit(
  p_audit_id uuid,
  p_submitted_by uuid
) RETURNS public.audits
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_admin boolean;
  v_assignee uuid;
  v_row public.audits;
BEGIN
  SELECT (u.role = 'ADMIN') INTO v_is_admin FROM public.users u WHERE u.id = p_submitted_by;
  SELECT a.assigned_to INTO v_assignee FROM public.audits a WHERE a.id = p_audit_id;
  IF v_assignee IS NULL THEN v_assignee := '00000000-0000-0000-0000-000000000000'::uuid; END IF;
  IF NOT (v_is_admin OR v_assignee = p_submitted_by) THEN
    RAISE EXCEPTION 'Permission denied: Only assignee or admin can submit audit for approval';
  END IF;
  UPDATE public.audits
     SET status = 'SUBMITTED',
         submitted_by = p_submitted_by,
         submitted_at = now(),
         updated_at = now()
   WHERE id = p_audit_id
     AND status IN ('IN_PROGRESS','COMPLETED')
  RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Cannot submit audit from current status or audit not found';
  END IF;
  RETURN v_row;
END;
$$;

-- Approve or reject audit (admin or branch manager of the audit's branch)
CREATE FUNCTION public.set_audit_approval(
  p_audit_id uuid,
  p_status text,
  p_user_id uuid,
  p_note text,
  p_signature_url text,
  p_signature_type text,
  p_approval_name text
) RETURNS public.audits
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_admin boolean := false;
  v_is_manager boolean := false;
  v_row public.audits;
BEGIN
  SELECT (u.role = 'ADMIN') INTO v_is_admin FROM public.users u WHERE u.id = p_user_id;
  SELECT EXISTS (
    SELECT 1
      FROM public.audits a
      JOIN public.branches b ON b.id = a.branch_id
      WHERE a.id = p_audit_id AND b.manager_id = p_user_id
  ) INTO v_is_manager;
  IF NOT (v_is_admin OR v_is_manager) THEN
    RAISE EXCEPTION 'Permission denied: Only admin or branch manager can approve/reject';
  END IF;

  IF lower(p_status) = 'approved' THEN
    UPDATE public.audits
       SET status = 'APPROVED',
           approved_by = p_user_id,
           approved_at = now(),
           approval_note = p_note,
           approval_signature_url = p_signature_url,
           approval_signature_type = p_signature_type,
           approval_name = p_approval_name,
           -- clear rejection metadata
           rejected_by = NULL,
           rejected_at = NULL,
           rejection_note = NULL,
           updated_at = now()
     WHERE id = p_audit_id
    RETURNING * INTO v_row;
  ELSE
    UPDATE public.audits
       SET status = 'REJECTED',
           rejected_by = p_user_id,
           rejected_at = now(),
           rejection_note = p_note,
           -- clear approval metadata
           approved_by = NULL,
           approved_at = NULL,
           approval_note = NULL,
           approval_signature_url = NULL,
           approval_signature_type = NULL,
           approval_name = NULL,
           updated_at = now()
     WHERE id = p_audit_id
    RETURNING * INTO v_row;
  END IF;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Audit not found';
  END IF;
  RETURN v_row;
END;
$$;;

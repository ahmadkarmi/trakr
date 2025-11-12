-- RPC: save_audit_progress (no defaulted params to satisfy Postgres ordering rules)
create or replace function public.save_audit_progress(
  p_audit_id uuid,
  p_actor_user_id uuid,
  p_responses jsonb,
  p_na_reasons jsonb,
  p_section_comments jsonb
) returns public.audits language plpgsql security definer as $$
DECLARE a public.audits;
BEGIN
  SELECT * INTO a FROM public.audits WHERE id = p_audit_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Audit not found: %', p_audit_id; END IF;
  -- block when submitted/approved
  IF a.status IN ('SUBMITTED','APPROVED') THEN
    RAISE EXCEPTION 'Edits blocked for status %', a.status;
  END IF;
  -- transition for draft/rejected
  IF a.status IN ('DRAFT','REJECTED') THEN
    a.status := 'IN_PROGRESS';
  END IF;
  a.responses := coalesce(a.responses, '{}'::jsonb) || coalesce(p_responses, '{}'::jsonb);
  a.na_reasons := coalesce(a.na_reasons, '{}'::jsonb) || coalesce(p_na_reasons, '{}'::jsonb);
  a.section_comments := coalesce(a.section_comments, '{}'::jsonb) || coalesce(p_section_comments, '{}'::jsonb);
  a.updated_at := now();
  UPDATE public.audits SET
    responses = a.responses,
    na_reasons = a.na_reasons,
    section_comments = a.section_comments,
    status = a.status,
    updated_at = a.updated_at
  WHERE id = a.id
  RETURNING * INTO a;
  RETURN a;
END;$$;

-- RPC: submit_audit
create or replace function public.submit_audit(
  p_audit_id uuid,
  p_submitted_by uuid
) returns public.audits language plpgsql security definer as $$
DECLARE a public.audits;
BEGIN
  SELECT * INTO a FROM public.audits WHERE id = p_audit_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Audit not found: %', p_audit_id; END IF;
  -- only IN_PROGRESS or COMPLETED
  IF a.status NOT IN ('IN_PROGRESS','COMPLETED') THEN
    RAISE EXCEPTION 'Cannot submit from status %', a.status;
  END IF;
  -- permission: only assignee or admin
  IF a.assigned_to IS DISTINCT FROM p_submitted_by THEN
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_submitted_by AND role = 'ADMIN') THEN
      RAISE EXCEPTION 'Permission denied: only assignee or admin can submit';
    END IF;
  END IF;
  UPDATE public.audits SET status='SUBMITTED', submitted_by=p_submitted_by, submitted_at=now(), updated_at=now()
  WHERE id = p_audit_id RETURNING * INTO a;
  RETURN a;
END;$$;

-- RPC: set_audit_approval
create or replace function public.set_audit_approval(
  p_audit_id uuid,
  p_status text,
  p_user_id uuid,
  p_note text,
  p_signature_url text,
  p_signature_type text,
  p_approval_name text
) returns public.audits language plpgsql security definer as $$
DECLARE a public.audits; b public.branches; is_admin boolean; is_manager boolean;
BEGIN
  SELECT * INTO a FROM public.audits WHERE id = p_audit_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Audit not found: %', p_audit_id; END IF;
  SELECT * INTO b FROM public.branches WHERE id = a.branch_id;
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = p_user_id AND role='ADMIN') INTO is_admin;
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = p_user_id AND role='BRANCH_MANAGER' AND id = b.manager_id) INTO is_manager;
  IF NOT (COALESCE(is_admin,false) OR COALESCE(is_manager,false)) THEN
    RAISE EXCEPTION 'Permission denied: only admin or branch manager can approve/reject';
  END IF;
  IF p_status = 'approved' THEN
    UPDATE public.audits SET status='APPROVED', approved_by=p_user_id, approved_at=now(), approval_note=p_note,
      approval_signature_url=p_signature_url, approval_signature_type=p_signature_type, approval_name=p_approval_name,
      rejected_by=null, rejected_at=null, rejection_note=null, updated_at=now()
    WHERE id=p_audit_id RETURNING * INTO a;
  ELSE
    UPDATE public.audits SET status='REJECTED', rejected_by=p_user_id, rejected_at=now(), rejection_note=p_note,
      approved_by=null, approved_at=null, approval_note=null, updated_at=now()
    WHERE id=p_audit_id RETURNING * INTO a;
  END IF;
  RETURN a;
END;$$;

-- RPC: admin_edit_audit
create or replace function public.admin_edit_audit(
  p_audit_id uuid,
  p_admin_user_id uuid,
  p_responses jsonb,
  p_na_reasons jsonb,
  p_section_comments jsonb
) returns public.audits language plpgsql security definer as $$
DECLARE a public.audits;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_admin_user_id AND role='ADMIN') THEN
    RAISE EXCEPTION 'Permission denied: only admin can edit approved/submitted audits';
  END IF;
  SELECT * INTO a FROM public.audits WHERE id = p_audit_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Audit not found: %', p_audit_id; END IF;
  a.responses := coalesce(a.responses, '{}'::jsonb) || coalesce(p_responses, '{}'::jsonb);
  a.na_reasons := coalesce(a.na_reasons, '{}'::jsonb) || coalesce(p_na_reasons, '{}'::jsonb);
  a.section_comments := coalesce(a.section_comments, '{}'::jsonb) || coalesce(p_section_comments, '{}'::jsonb);
  a.updated_at := now();
  UPDATE public.audits SET responses=a.responses, na_reasons=a.na_reasons, section_comments=a.section_comments, updated_at=a.updated_at WHERE id=a.id
  RETURNING * INTO a;
  RETURN a;
END;$$;

-- RPC: reassign_unstarted_audits_for_branch
create or replace function public.reassign_unstarted_audits_for_branch(
  p_branch_id uuid,
  p_to_user uuid
) returns integer language plpgsql security definer as $$
DECLARE cnt int := 0; r record;
BEGIN
  FOR r IN SELECT id FROM public.audits WHERE branch_id=p_branch_id AND status='DRAFT' AND is_archived=false LOOP
    UPDATE public.audits SET assigned_to=p_to_user, updated_at=now() WHERE id=r.id;
    cnt := cnt + 1;
  END LOOP;
  RETURN cnt;
END;$$;

-- RPC: reassign_unstarted_audits_for_branches
create or replace function public.reassign_unstarted_audits_for_branches(
  p_branch_ids uuid[],
  p_to_user uuid
) returns integer language plpgsql security definer as $$
DECLARE total int := 0; bid uuid;
BEGIN
  FOREACH bid IN ARRAY p_branch_ids LOOP
    total := total + public.reassign_unstarted_audits_for_branch(bid, p_to_user);
  END LOOP;
  RETURN total;
END;$$;

-- RPC: set_audit_assigned_to (for Undo)
create or replace function public.set_audit_assigned_to(
  p_audit_id uuid,
  p_to_user uuid
) returns public.audits language plpgsql security definer as $$
DECLARE a public.audits;
BEGIN
  SELECT * INTO a FROM public.audits WHERE id=p_audit_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Audit not found: %', p_audit_id; END IF;
  IF a.is_archived OR a.status NOT IN ('DRAFT','IN_PROGRESS','REJECTED') THEN
    RETURN a; -- noop
  END IF;
  UPDATE public.audits SET assigned_to=p_to_user, updated_at=now() WHERE id=p_audit_id RETURNING * INTO a;
  RETURN a;
END;$$;;

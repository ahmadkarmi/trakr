-- Phase 1: Server-side audit cycle guard
-- Creates helper + RPC to enforce one audit per period per branch/survey/org

-- Helper: compute the current audit period bounds for an org
create or replace function public.get_org_period_bounds(
  p_org_id uuid,
  p_frequency public.audit_frequency
) returns TABLE(start_at timestamptz, end_at timestamptz)
language plpgsql
as $$
declare
  v_timezone text;
  v_week_start integer;
  v_now timestamptz := now();
  v_local_now timestamptz;
  v_local_start timestamptz;
  v_local_end timestamptz;
  v_delta interval;
begin
  select o.time_zone, coalesce(o.week_starts_on, 1)
    into v_timezone, v_week_start
    from public.organizations o
   where o.id = p_org_id;

  if v_timezone is null then
    v_timezone := 'UTC';
  end if;

  begin
    v_local_now := (timezone(v_timezone, v_now));
  exception when others then
    -- Fallback if timezone name is invalid
    v_local_now := v_now;
  end;

  if p_frequency is null or p_frequency = 'UNLIMITED' then
    v_local_start := date_trunc('day', v_local_now);
    v_local_end := date_trunc('day', v_local_now) + interval '1 day' - interval '1 millisecond';
  elsif p_frequency = 'DAILY' then
    v_local_start := date_trunc('day', v_local_now);
    v_local_end := date_trunc('day', v_local_now) + interval '1 day' - interval '1 millisecond';
  elsif p_frequency = 'WEEKLY' then
    v_local_start := date_trunc('week', v_local_now + (v_week_start || ' days')::interval) - (v_week_start || ' days')::interval;
    v_local_end := v_local_start + interval '7 days' - interval '1 millisecond';
  elsif p_frequency = 'MONTHLY' then
    v_local_start := date_trunc('month', v_local_now);
    v_local_end := (date_trunc('month', v_local_now) + interval '1 month') - interval '1 millisecond';
  elsif p_frequency = 'QUARTERLY' then
    v_local_start := date_trunc('quarter', v_local_now);
    v_local_end := (date_trunc('quarter', v_local_now) + interval '3 months') - interval '1 millisecond';
  else
    -- default fallback: one day window
    v_local_start := date_trunc('day', v_local_now);
    v_local_end := date_trunc('day', v_local_now) + interval '1 day' - interval '1 millisecond';
  end if;

  v_delta := v_local_now - v_now;
  start_at := v_local_start - v_delta;
  end_at := v_local_end - v_delta;
  return next;
end;
$$;

revoke all on function public.get_org_period_bounds(uuid, public.audit_frequency) from public;

-- RPC: create audit with cycle guard
create or replace function public.create_audit_with_cycle_guard(
  p_org_id uuid,
  p_branch_id uuid,
  p_survey_id uuid,
  p_assigned_to uuid
) returns public.audits
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org public.organizations;
  v_branch public.branches;
  v_survey public.surveys;
  v_period record;
  v_existing record;
  v_now timestamptz := now();
  v_created public.audits;
  v_gating text;
  v_due timestamptz;
  v_applicable uuid[];
  v_has_existing boolean := false;
  v_is_overdue boolean;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_org from public.organizations where id = p_org_id;
  if not found then
    raise exception 'Organization not found' using errcode = 'P0002';
  end if;

  -- Authorization: caller must belong to org unless super admin
  if not is_super_admin() then
    if my_org_id() is distinct from p_org_id then
      raise exception 'You do not have access to this organization' using errcode = '42501';
    end if;
  end if;

  select * into v_branch from public.branches where id = p_branch_id and org_id = p_org_id;
  if not found then
    raise exception 'Branch not found in organization' using errcode = 'P0002';
  end if;

  select * into v_survey from public.surveys where id = p_survey_id and org_id = p_org_id;
  if not found then
    raise exception 'Survey not found in organization' using errcode = 'P0002';
  end if;

  v_applicable := coalesce(v_survey.applicable_branch_ids, '{}');
  if array_length(v_applicable, 1) is not null and not (p_branch_id = any(v_applicable)) then
    raise exception 'This survey is not applicable to the selected branch.' using errcode = '40501';
  end if;

  select * into v_period from public.get_org_period_bounds(p_org_id, v_survey.frequency);
  if v_period is null then
    raise exception 'Could not resolve audit period for organization';
  end if;

  v_gating := coalesce(v_org.gating_policy, 'completed_approved');
  v_has_existing := false;

  for v_existing in
    select id, status, due_at, period_start, period_end
      from public.audits
     where org_id = p_org_id
       and branch_id = p_branch_id
       and survey_id = p_survey_id
       and is_archived = false
       and period_start <= v_period.end_at
       and period_end >= v_period.start_at
  loop
    v_is_overdue := coalesce(v_existing.due_at, v_existing.period_end) < v_now;
    if v_existing.status <> 'REJECTED' and not v_is_overdue then
      if v_gating = 'any' then
        v_has_existing := true;
        exit;
      elsif v_gating = 'completed_approved' then
        if v_existing.status in ('SUBMITTED','COMPLETED','APPROVED') then
          v_has_existing := true;
          exit;
        end if;
      end if;
    end if;
  end loop;

  if v_has_existing then
    raise exception using
      errcode = '23514',
      message = format('An audit for this survey and branch already exists for the current %s cycle. You cannot create another until the existing audit is overdue or the next cycle begins.', lower(v_survey.frequency::text));
  end if;

  v_due := coalesce(v_period.end_at, v_now);

  insert into public.audits (
    org_id,
    branch_id,
    survey_id,
    survey_version,
    assigned_to,
    status,
    responses,
    na_reasons,
    section_comments,
    created_at,
    updated_at,
    period_start,
    period_end,
    due_at,
    is_archived,
    created_origin
  ) values (
    p_org_id,
    p_branch_id,
    p_survey_id,
    coalesce(v_survey.version, 1),
    p_assigned_to,
    'DRAFT',
    '{}'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb,
    v_now,
    v_now,
    v_period.start_at,
    v_period.end_at,
    v_due,
    false,
    'USER'
  )
  returning * into v_created;

  return v_created;
end;
$$;

revoke all on function public.create_audit_with_cycle_guard(uuid, uuid, uuid, uuid) from public;
grant execute on function public.create_audit_with_cycle_guard(uuid, uuid, uuid, uuid) to authenticated;

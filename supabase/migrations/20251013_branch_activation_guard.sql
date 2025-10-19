-- Enforce: cannot activate a branch unless it has auditor coverage (directly or via zone)
create or replace function public.enforce_branch_activation_coverage()
returns trigger
language plpgsql
security invoker
as $$
declare
  v_has_coverage boolean := false;
begin
  -- Only check when becoming active (on insert or update)
  if NEW.is_active is not true then
    return NEW;
  end if;
  if TG_OP = 'UPDATE' and coalesce(OLD.is_active,false) = true then
    -- was active already, allow
    return NEW;
  end if;

  -- Direct coverage: any assignment whose branch_ids includes NEW.id (org-scoped via join to users)
  select exists (
    select 1
      from public.auditor_assignments a
      join public.users u on u.id = a.user_id
     where u.org_id = NEW.org_id
       and to_jsonb(a.branch_ids) @> to_jsonb(ARRAY[NEW.id])
  ) into v_has_coverage;

  if not v_has_coverage then
    -- Zone coverage: branch is in a zone and any assignment includes that zone
    select exists (
      select 1
        from public.auditor_assignments a
        join public.users u on u.id = a.user_id
        join public.zone_branches zb on zb.branch_id = NEW.id
       where u.org_id = NEW.org_id
         and to_jsonb(a.zone_ids) @> to_jsonb(ARRAY[zb.zone_id])
    ) into v_has_coverage;
  end if;

  if not v_has_coverage then
    raise exception 'Cannot activate branch %: at least one auditor must cover this branch (directly or via zone).', NEW.id
      using errcode = '23514';
  end if;

  return NEW;
end;
$$;

-- Apply on insert and update
DROP TRIGGER IF EXISTS trg_enforce_branch_activation_coverage_insupd ON public.branches;
create trigger trg_enforce_branch_activation_coverage_insupd
before insert or update on public.branches
for each row execute function public.enforce_branch_activation_coverage();

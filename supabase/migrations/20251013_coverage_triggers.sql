-- Triggers to block removing auditor coverage from active branches

create or replace function public.fn_branch_covered_after_change(
  p_branch_id uuid,
  p_user_id uuid,
  p_new_branch_ids uuid[],
  p_new_zone_ids uuid[]
) returns boolean
language sql
stable
as $$
  select exists (
    -- Other users' direct assignments
    select 1 from public.auditor_assignments aa
    where aa.user_id <> p_user_id
      and p_branch_id = any(coalesce(aa.branch_ids, '{}'::uuid[]))
    union all
    -- Other users' zone-based assignments
    select 1 from public.auditor_assignments aa
    where aa.user_id <> p_user_id
      and exists (
        select 1 from public.zone_branches zb
        where zb.branch_id = p_branch_id
          and zb.zone_id = any(coalesce(aa.zone_ids, '{}'::uuid[]))
      )
    union all
    -- Self (new) direct
    select 1 where p_branch_id = any(coalesce(p_new_branch_ids, '{}'::uuid[]))
    union all
    -- Self (new) zone-based
    select 1 from public.zone_branches zb
    where zb.branch_id = p_branch_id
      and zb.zone_id = any(coalesce(p_new_zone_ids, '{}'::uuid[]))
  );
$$;

-- BEFORE UPDATE on auditor_assignments: prevent removing coverage for active branches
create or replace function public.trg_auditor_assignments_before_update()
returns trigger
language plpgsql as $$
declare
  prev_branch_ids uuid[] := coalesce(OLD.branch_ids, '{}'::uuid[]);
  new_branch_ids uuid[] := coalesce(NEW.branch_ids, '{}'::uuid[]);
  prev_zone_ids uuid[] := coalesce(OLD.zone_ids, '{}'::uuid[]);
  new_zone_ids uuid[] := coalesce(NEW.zone_ids, '{}'::uuid[]);
  removed_branch uuid;
  removed_zone uuid;
  removed_branch_ids uuid[];
  removed_zone_ids uuid[];
begin
  -- Removed direct branches
  select array_agg(b) into removed_branch_ids from (
    select unnest(prev_branch_ids) as b
    except
    select unnest(new_branch_ids)
  ) s;
  foreach removed_branch in array coalesce(removed_branch_ids, '{}'::uuid[]) loop
    if removed_branch is not null then
      if exists (select 1 from public.branches b where b.id = removed_branch and b.is_active) then
        if not public.fn_branch_covered_after_change(removed_branch, NEW.user_id, new_branch_ids, new_zone_ids) then
          raise exception 'Cannot remove auditors from an active branch (%). Deactivate the branch first.', removed_branch;
        end if;
      end if;
    end if;
  end loop;

  -- Removed zones impacting branches
  select array_agg(z) into removed_zone_ids from (
    select unnest(prev_zone_ids) as z
    except
    select unnest(new_zone_ids)
  ) s;
  foreach removed_zone in array coalesce(removed_zone_ids, '{}'::uuid[]) loop
    if removed_zone is not null then
      for removed_branch in select branch_id from public.zone_branches where zone_id = removed_zone loop
        if exists (select 1 from public.branches b where b.id = removed_branch and b.is_active) then
          if not public.fn_branch_covered_after_change(removed_branch, NEW.user_id, new_branch_ids, new_zone_ids) then
            raise exception 'Zone change would leave active branch (%) without auditors. Deactivate or reassign first.', removed_branch;
          end if;
        end if;
      end loop;
    end if;
  end loop;

  return NEW;
end;$$;

create trigger auditor_assignments_before_update
before update on public.auditor_assignments
for each row execute function public.trg_auditor_assignments_before_update();

-- BEFORE DELETE on auditor_assignments: prevent deleting last coverage for active branches
create or replace function public.trg_auditor_assignments_before_delete()
returns trigger
language plpgsql as $$
declare
  ob uuid; -- old branch
  removed_zone uuid;
begin
  -- Direct branches
  foreach ob in array coalesce(OLD.branch_ids, '{}'::uuid[]) loop
    if exists (select 1 from public.branches b where b.id = ob and b.is_active) then
      if not exists (
        -- Other users direct
        select 1 from public.auditor_assignments aa
        where aa.user_id <> OLD.user_id and ob = any(coalesce(aa.branch_ids, '{}'::uuid[]))
        union all
        -- Other users zone-based
        select 1 from public.auditor_assignments aa
        where aa.user_id <> OLD.user_id
          and exists (select 1 from public.zone_branches zb where zb.branch_id = ob and zb.zone_id = any(coalesce(aa.zone_ids, '{}'::uuid[])))
      ) then
        raise exception 'Cannot remove auditors from an active branch (%). Deactivate the branch first.', ob;
      end if;
    end if;
  end loop;

  -- Zones impact
  foreach removed_zone in array coalesce(OLD.zone_ids, '{}'::uuid[]) loop
    for ob in select branch_id from public.zone_branches where zone_id = removed_zone loop
      if exists (select 1 from public.branches b where b.id = ob and b.is_active) then
        if not exists (
          select 1 from public.auditor_assignments aa
          where aa.user_id <> OLD.user_id and ob = any(coalesce(aa.branch_ids, '{}'::uuid[]))
          union all
          select 1 from public.auditor_assignments aa
          where aa.user_id <> OLD.user_id
            and exists (select 1 from public.zone_branches zb where zb.branch_id = ob and zb.zone_id = any(coalesce(aa.zone_ids, '{}'::uuid[])))
        ) then
          raise exception 'Cannot remove auditors from an active branch (%). Deactivate the branch first.', ob;
        end if;
      end if;
    end loop;
  end loop;

  return OLD;
end;$$;

create trigger auditor_assignments_before_delete
before delete on public.auditor_assignments
for each row execute function public.trg_auditor_assignments_before_delete();

-- BEFORE DELETE on zone_branches: prevent removing zone coverage for active branches if no other coverage remains
create or replace function public.trg_zone_branches_before_delete()
returns trigger
language plpgsql as $$
begin
  if exists (select 1 from public.branches b where b.id = OLD.branch_id and b.is_active) then
    if not exists (
      -- Direct coverage
      select 1 from public.auditor_assignments aa where OLD.branch_id = any(coalesce(aa.branch_ids, '{}'::uuid[]))
      union all
      -- Zone coverage via other zones linking this branch
      select 1 from public.auditor_assignments aa
      where exists (
        select 1 from public.zone_branches zb
        where zb.branch_id = OLD.branch_id
          and zb.zone_id <> OLD.zone_id
          and zb.zone_id = any(coalesce(aa.zone_ids, '{}'::uuid[]))
      )
    ) then
      raise exception 'Zone unlink would leave active branch (%) without auditors. Deactivate or reassign first.', OLD.branch_id;
    end if;
  end if;
  return OLD;
end;$$;

create trigger zone_branches_before_delete
before delete on public.zone_branches
for each row execute function public.trg_zone_branches_before_delete();

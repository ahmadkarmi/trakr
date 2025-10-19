-- Coverage function and RLS policy to prevent activating branches without auditor coverage

create or replace function public.branch_has_auditor_coverage(p_branch_id uuid)
returns boolean
language sql
stable
as $$
  -- A branch has coverage if there exists at least one active auditor user who is assigned
  -- either directly to the branch via auditor_assignments.branch_ids OR indirectly via a zone
  -- that contains the branch (zone_branches.zone_id in auditor_assignments.zone_ids).
  select exists (
    select 1
    from public.auditor_assignments aa
    join public.users u
      on u.id = aa.user_id
     and u.role = 'AUDITOR'::public.user_role
    where p_branch_id = any(coalesce(aa.branch_ids, '{}'::uuid[]))
       or exists (
         select 1
         from public.zone_branches zb
         where zb.branch_id = p_branch_id
           and zb.zone_id = any(coalesce(aa.zone_ids, '{}'::uuid[]))
       )
  );
$$;

-- Ensure RLS is enabled
alter table public.branches enable row level security;

-- Policy: updating a branch to active requires coverage
drop policy if exists branches_activate_requires_coverage on public.branches;
create policy branches_activate_requires_coverage
  on public.branches
  for update
  using (true)
  with check (
    -- Only enforce when row is being set active
    not is_active or public.branch_has_auditor_coverage(id)
  );

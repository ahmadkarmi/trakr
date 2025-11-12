-- Mapping fixes: auth.uid() -> users.auth_user_id
create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.users where auth_user_id = auth.uid()
$$;

create or replace function public.current_user_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.users where auth_user_id = auth.uid()
$$;

-- Users policies
drop policy if exists users_select on public.users;
create policy users_select on public.users
for select using (
  public.is_dev_mode() OR public.is_admin() OR users.auth_user_id = auth.uid() OR users.org_id = public.current_user_org_id()
);

drop policy if exists users_update_self_or_admin on public.users;
create policy users_update_self_or_admin on public.users
for update using (
  public.is_dev_mode() OR public.is_admin() OR users.auth_user_id = auth.uid()
) with check (
  public.is_dev_mode() OR public.is_admin() OR users.auth_user_id = auth.uid()
);

-- Branches policy (manager or admin)
drop policy if exists branches_update on public.branches;
create policy branches_update on public.branches
for update using (
  public.is_dev_mode() OR public.is_admin() OR branches.manager_id = public.current_app_user_id()
) with check (
  public.is_dev_mode() OR public.is_admin() OR branches.manager_id = public.current_app_user_id()
);

-- Audits update: assignee mapped via users.auth_user_id
drop policy if exists audits_update_assignee_or_admin on public.audits;
create policy audits_update_assignee_or_admin on public.audits
for update using (
  public.is_dev_mode()
  OR public.is_admin()
  OR (
    audits.status NOT IN ('SUBMITTED','APPROVED')
    AND exists (
      select 1 from public.users u where u.id = audits.assigned_to and u.auth_user_id = auth.uid()
    )
  )
) with check (
  public.is_dev_mode()
  OR public.is_admin()
  OR (
    audits.status NOT IN ('SUBMITTED','APPROVED')
    AND exists (
      select 1 from public.users u where u.id = audits.assigned_to and u.auth_user_id = auth.uid()
    )
  )
);

-- Auditor branch assignments select by org
drop policy if exists aba_select on public.auditor_branch_assignments;
create policy aba_select on public.auditor_branch_assignments
for select using (
  public.is_dev_mode() OR auditor_branch_assignments.org_id = public.current_user_org_id()
);

-- Activity logs select by org
drop policy if exists activity_logs_select on public.activity_logs;
create policy activity_logs_select on public.activity_logs
for select using (
  public.is_dev_mode() OR activity_logs.org_id = public.current_user_org_id()
);
;

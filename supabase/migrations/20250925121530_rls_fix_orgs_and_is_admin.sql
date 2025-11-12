-- Fix is_admin mapping to auth.uid()
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.users where auth_user_id = auth.uid() and role = 'ADMIN'
  )
$$;

-- Fix organizations select policy to use current_user_org_id()
drop policy if exists orgs_select on public.organizations;
create policy orgs_select on public.organizations
for select using (
  public.is_dev_mode() OR organizations.id = public.current_user_org_id()
);
;

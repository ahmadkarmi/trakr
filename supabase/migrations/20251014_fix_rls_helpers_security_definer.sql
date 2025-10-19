-- Fix recursive RLS helper functions causing "stack depth limit exceeded"
-- Recreate helper functions with SECURITY DEFINER and row_security disabled
-- so reading from public.users does not trigger policies that call these helpers again.

-- is_super_admin(): true when current user has SUPER_ADMIN role
create or replace function public.is_super_admin()
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare v boolean;
begin
  perform set_config('row_security', 'off', true);
  select exists (
    select 1 from public.users u
    where (u.auth_user_id = auth.uid() or u.id = auth.uid()) and u.role = 'SUPER_ADMIN'
  ) into v;
  return v;
end;
$$;

-- is_admin(): true when current user is ADMIN or SUPER_ADMIN
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare v boolean;
begin
  perform set_config('row_security', 'off', true);
  select exists (
    select 1 from public.users u
    where (u.auth_user_id = auth.uid() or u.id = auth.uid()) and u.role in ('ADMIN','SUPER_ADMIN')
  ) into v;
  return v;
end;
$$;

-- my_org_id(): organization id of current user
create or replace function public.my_org_id()
returns uuid
language plpgsql
security definer
stable
set search_path = public
as $$
declare v uuid;
begin
  perform set_config('row_security', 'off', true);
  select u.org_id into v from public.users u where (u.auth_user_id = auth.uid() or u.id = auth.uid());
  return v;
end;
$$;

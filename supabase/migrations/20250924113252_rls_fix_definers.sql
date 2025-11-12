-- Ensure helper functions run with definer rights to avoid recursive RLS evaluation
create or replace function public.current_user_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.users where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'ADMIN' from public.users where id = auth.uid()), false)
$$;;

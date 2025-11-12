-- Harden is_dev_mode helper and avoid recursion risks
create or replace function public.is_dev_mode()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.app_config
    where key = 'dev_mode' and value in ('true','1','on','t','yes')
  )
$$;

-- Enable RLS on app_config and define policies (no IF NOT EXISTS in Postgres)
alter table if exists public.app_config enable row level security;
drop policy if exists app_config_select on public.app_config;
drop policy if exists app_config_admin_write on public.app_config;
create policy app_config_select on public.app_config for select using (auth.uid() is not null);
create policy app_config_admin_write on public.app_config for all using (public.is_admin()) with check (public.is_admin());

-- Rewrite users select policy to avoid recursive org join
drop policy if exists users_select on public.users;
create policy users_select on public.users
for select using (
  public.is_dev_mode() OR users.id = auth.uid() OR public.is_admin()
);
;

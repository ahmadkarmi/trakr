-- Data access audit + org export logging

create table if not exists public.data_access_audit (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  user_id uuid references public.users(id),
  action text not null default 'org_export',
  reason text,
  export_scope jsonb,
  created_at timestamptz not null default now()
);

alter table public.data_access_audit enable row level security;

drop policy if exists data_access_audit_select on public.data_access_audit;
create policy data_access_audit_select on public.data_access_audit
  for select
  using (
    public.is_super_admin() OR org_id = public.current_user_org_id()
  );

drop policy if exists data_access_audit_insert on public.data_access_audit;
create policy data_access_audit_insert on public.data_access_audit
  for insert
  with check (
    auth.uid() = user_id
  );

create or replace function public.log_data_access(
  p_org_id uuid,
  p_action text,
  p_reason text,
  p_export_scope jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.data_access_audit (org_id, user_id, action, reason, export_scope)
  values (
    coalesce(p_org_id, public.current_user_org_id()),
    auth.uid(),
    coalesce(nullif(p_action, ''), 'org_export'),
    p_reason,
    coalesce(p_export_scope, '{}'::jsonb)
  );
end;
$$;

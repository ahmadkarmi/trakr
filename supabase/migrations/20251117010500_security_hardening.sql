-- Security hardening: enforce app_config RLS + safe helper search_path

-- 1) Ensure app_config exists and has a default dev_mode row
create table if not exists public.app_config (
  key text primary key,
  value text not null
);
insert into public.app_config (key, value)
values ('dev_mode', 'false')
on conflict (key) do nothing;

-- 2) Harden is_dev_mode helper (security definer + fixed search_path)
create or replace function public.is_dev_mode()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_config
    where key = 'dev_mode'
      and value in ('true','1','on','t','yes')
  )
$$;

-- 3) Enable RLS on app_config with safe policies
alter table if exists public.app_config enable row level security;

drop policy if exists app_config_read on public.app_config;
create policy app_config_read on public.app_config
  for select
  using (auth.uid() is not null);

drop policy if exists app_config_admin_write on public.app_config;
create policy app_config_admin_write on public.app_config
  for all
  using (public.is_admin_or_super())
  with check (public.is_admin_or_super());

-- 4) Force helper/trigger functions to run with search_path=public
--    to satisfy Supabase advisors and avoid hijacked schemas.
DO $$
DECLARE
  target_names text[] := ARRAY[
    'get_org_period_bounds',
    'update_branch_manager_assignments_updated_at',
    'update_auditor_assignments_updated_at',
    'publish_survey_version',
    'handle_new_user',
    '_actor_user_id',
    'set_audit_created_provenance',
    'set_audit_status_provenance',
    'enforce_system_scheduled_auditor',
    'enforce_branch_activation_coverage',
    'branch_has_auditor_coverage',
    'fn_branch_covered_after_change',
    'trg_auditor_assignments_before_update',
    'trg_auditor_assignments_before_delete',
    'trg_zone_branches_before_delete',
    'generate_invitation_token',
    'current_user_id',
    'current_user_org_id',
    'current_user_role',
    'is_super_admin',
    'is_admin_or_super',
    'is_current_user_super_admin',
    'can_manage_auditor_assignment',
    'user_assigned_branch_ids',
    'user_managed_branch_ids',
    'validate_rls_for_current_user'
  ];
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regproc AS ident
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(target_names)
  LOOP
    EXECUTE format('alter function %s set search_path = public', fn.ident);
  END LOOP;
END $$;

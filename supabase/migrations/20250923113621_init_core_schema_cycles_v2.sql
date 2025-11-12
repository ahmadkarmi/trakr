-- Enable required extensions
create extension if not exists pgcrypto;
create extension if not exists pg_cron;

-- Enums
create type public.audit_status as enum ('DRAFT','IN_PROGRESS','COMPLETED','SUBMITTED','APPROVED','REJECTED');
create type public.audit_frequency as enum ('DAILY','WEEKLY','MONTHLY','QUARTERLY');
create type public.user_role as enum ('ADMIN','BRANCH_MANAGER','AUDITOR');

-- Core tables
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  time_zone text not null default 'UTC',
  week_starts_on smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.users (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null unique,
  role public.user_role not null,
  branch_id uuid null,
  auth_user_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  address text,
  manager_id uuid null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.zones (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.zone_branches (
  zone_id uuid not null references public.zones(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  primary key (zone_id, branch_id)
);

create table public.surveys (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  version int not null default 1,
  frequency public.audit_frequency not null default 'WEEKLY',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.survey_sections (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  title text not null,
  description text,
  order_num int not null default 1
);

create table public.survey_questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  section_id uuid not null references public.survey_sections(id) on delete cascade,
  question_text text not null,
  question_type text not null default 'YES_NO',
  is_weighted boolean not null default false,
  yes_weight int,
  no_weight int,
  required boolean not null default false,
  order_num int not null default 1
);

create table public.audits (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  survey_id uuid not null references public.surveys(id) on delete restrict,
  survey_version int not null default 1,
  assigned_to uuid null references public.users(id),
  status public.audit_status not null default 'DRAFT',
  responses jsonb not null default '{}',
  na_reasons jsonb not null default '{}',
  section_comments jsonb not null default '{}',
  submitted_by uuid null references public.users(id),
  submitted_at timestamptz,
  approved_by uuid null references public.users(id),
  approved_at timestamptz,
  approval_note text,
  rejected_by uuid null references public.users(id),
  rejected_at timestamptz,
  rejection_note text,
  approval_signature_url text,
  approval_signature_type text,
  approval_name text,
  period_start timestamptz not null,
  period_end timestamptz not null,
  due_at timestamptz not null,
  is_archived boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index audits_unique_period on public.audits (branch_id, survey_id, period_start);
create index audits_org_status_idx on public.audits (org_id, status);

create table public.audit_photos (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits(id) on delete cascade,
  section_id uuid null,
  filename text not null,
  url text not null,
  uploaded_by uuid not null references public.users(id),
  uploaded_at timestamptz not null default now()
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid null references public.users(id),
  action text not null,
  details text,
  entity_type text,
  entity_id uuid,
  created_at timestamptz not null default now()
);

create table public.auditor_branch_assignments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  unique (user_id, branch_id, period_start)
);

create table public.zone_assignments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  zone_id uuid not null references public.zones(id) on delete cascade,
  user_id uuid not null references public.users(id),
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  unique (zone_id, user_id)
);

-- RLS enablement (permissive for now; to be tightened later)
alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.branches enable row level security;
alter table public.zones enable row level security;
alter table public.zone_branches enable row level security;
alter table public.surveys enable row level security;
alter table public.survey_sections enable row level security;
alter table public.survey_questions enable row level security;
alter table public.audits enable row level security;
alter table public.audit_photos enable row level security;
alter table public.activity_logs enable row level security;
alter table public.auditor_branch_assignments enable row level security;
alter table public.zone_assignments enable row level security;

create policy rls_select_all_authenticated on public.organizations for select to authenticated using (true);
create policy rls_select_all_authenticated_users on public.users for select to authenticated using (true);
create policy rls_select_all_authenticated_branches on public.branches for select to authenticated using (true);
create policy rls_select_all_authenticated_zones on public.zones for select to authenticated using (true);
create policy rls_select_all_authenticated_zone_branches on public.zone_branches for select to authenticated using (true);
create policy rls_select_all_authenticated_surveys on public.surveys for select to authenticated using (true);
create policy rls_select_all_authenticated_sections on public.survey_sections for select to authenticated using (true);
create policy rls_select_all_authenticated_questions on public.survey_questions for select to authenticated using (true);
create policy rls_select_all_authenticated_audits on public.audits for select to authenticated using (true);
create policy rls_select_all_authenticated_photos on public.audit_photos for select to authenticated using (true);
create policy rls_select_all_authenticated_logs on public.activity_logs for select to authenticated using (true);
create policy rls_select_all_authenticated_assign on public.auditor_branch_assignments for select to authenticated using (true);
create policy rls_select_all_authenticated_zone_assign on public.zone_assignments for select to authenticated using (true);

-- Seed organization and users (Sunday as week start)
DO $$
DECLARE v_org uuid; v_admin uuid; v_manager uuid; v_auditor uuid;
BEGIN
  insert into public.organizations (name, time_zone, week_starts_on) values ('Acme Corporation','UTC',0) returning id into v_org;
  insert into public.users (org_id, email, role) values (v_org, 'admin@trakr.com', 'ADMIN') returning id into v_admin;
  insert into public.users (org_id, email, role) values (v_org, 'branchmanager@trakr.com', 'BRANCH_MANAGER') returning id into v_manager;
  insert into public.users (org_id, email, role) values (v_org, 'auditor@trakr.com', 'AUDITOR') returning id into v_auditor;
END$$;

-- Stub daily scheduler function and job
create or replace function public.ensure_current_period_scheduling() returns void language plpgsql as $$
BEGIN
  -- TODO: implement cycle-aware audit creation and manual assignment clearing
  PERFORM 1;
END;$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'schedule' AND pronamespace = 'cron'::regnamespace) THEN
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'trakr-schedule-daily') THEN
        PERFORM cron.schedule('trakr-schedule-daily', '0 3 * * *', 'select public.ensure_current_period_scheduling();');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
END$$;;

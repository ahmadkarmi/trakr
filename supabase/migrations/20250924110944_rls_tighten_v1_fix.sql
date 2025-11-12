-- RLS Tightening (with dev-mode toggle) - fixed policyname column
-- 1) Dev-mode toggle and helpers
create table if not exists public.app_config (
  key text primary key,
  value text not null
);
insert into public.app_config(key, value)
values ('dev_mode', 'true')
on conflict (key) do nothing;

create or replace function public.is_dev_mode()
returns boolean
language sql
stable
as $$
  select exists(
    select 1
    from public.app_config
    where key = 'dev_mode' and value in ('true','1','on','t','yes')
  )
$$;

create or replace function public.current_user_org_id()
returns uuid
language sql
stable
as $$
  select org_id from public.users where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((select role = 'ADMIN' from public.users where id = auth.uid()), false)
$$;

-- 2) Drop existing policies on core tables
DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'organizations','users','audits','audit_photos','auditor_branch_assignments',
        'zones','zone_branches','zone_assignments','surveys','survey_sections','survey_questions',
        'branches','activity_logs'
      )
  ) LOOP
    EXECUTE format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END$$;

-- 3) Enable RLS on core tables
alter table if exists public.organizations enable row level security;
alter table if exists public.users enable row level security;
alter table if exists public.audits enable row level security;
alter table if exists public.audit_photos enable row level security;
alter table if exists public.auditor_branch_assignments enable row level security;
alter table if exists public.zones enable row level security;
alter table if exists public.zone_branches enable row level security;
alter table if exists public.zone_assignments enable row level security;
alter table if exists public.surveys enable row level security;
alter table if exists public.survey_sections enable row level security;
alter table if exists public.survey_questions enable row level security;
alter table if exists public.branches enable row level security;
alter table if exists public.activity_logs enable row level security;

-- 4) Organizations
create policy orgs_select on public.organizations
for select using (
  public.is_dev_mode() OR (
    auth.uid() is not null and exists (
      select 1 from public.users u where u.id = auth.uid() and u.org_id = organizations.id
    )
  )
);
-- Admin-only write
create policy orgs_write_admin on public.organizations
for all to authenticated using (public.is_dev_mode() or public.is_admin()) with check (public.is_dev_mode() or public.is_admin());

-- 5) Users
create policy users_select on public.users
for select using (
  public.is_dev_mode() OR (
    auth.uid() is not null and (
      users.id = auth.uid() OR users.org_id = public.current_user_org_id()
    )
  )
);
-- User can update own row; admin can update any in org. Admin-only insert/delete.
create policy users_update_self_or_admin on public.users
for update using (
  public.is_dev_mode() or users.id = auth.uid() or public.is_admin()
) with check (
  public.is_dev_mode() or users.id = auth.uid() or public.is_admin()
);
create policy users_admin_insert on public.users
for insert with check (public.is_dev_mode() or public.is_admin());
create policy users_admin_delete on public.users
for delete using (public.is_dev_mode() or public.is_admin());

-- 6) Branches
create policy branches_select on public.branches
for select using (
  public.is_dev_mode() OR public.current_user_org_id() = branches.org_id
);
create policy branches_update on public.branches
for update using (
  public.is_dev_mode() OR public.is_admin() OR branches.manager_id = auth.uid()
) with check (
  public.is_dev_mode() OR public.is_admin() OR branches.manager_id = auth.uid()
);
create policy branches_admin_insdel on public.branches
for insert with check (public.is_dev_mode() or public.is_admin());
create policy branches_admin_delete on public.branches
for delete using (public.is_dev_mode() or public.is_admin());

-- 7) Zones and links
create policy zones_select on public.zones
for select using (
  public.is_dev_mode() OR public.current_user_org_id() = zones.org_id
);
create policy zones_admin_write on public.zones
for all using (public.is_dev_mode() or public.is_admin()) with check (public.is_dev_mode() or public.is_admin());

create policy zone_branches_select on public.zone_branches
for select using (
  public.is_dev_mode() OR exists (select 1 from public.zones z where z.id = zone_branches.zone_id and z.org_id = public.current_user_org_id())
);
create policy zone_branches_admin_write on public.zone_branches
for all using (public.is_dev_mode() or public.is_admin()) with check (public.is_dev_mode() or public.is_admin());

create policy zone_assignments_select on public.zone_assignments
for select using (
  public.is_dev_mode() OR exists (select 1 from public.zones z where z.id = zone_assignments.zone_id and z.org_id = public.current_user_org_id())
);
create policy zone_assignments_admin_write on public.zone_assignments
for all using (public.is_dev_mode() or public.is_admin()) with check (public.is_dev_mode() or public.is_admin());

-- 8) Surveys
create policy surveys_select on public.surveys
for select using (
  public.is_dev_mode() OR public.current_user_org_id() = surveys.org_id
);
create policy surveys_admin_write on public.surveys
for all using (public.is_dev_mode() or public.is_admin()) with check (public.is_dev_mode() or public.is_admin());

create policy survey_sections_select on public.survey_sections
for select using (
  public.is_dev_mode() OR exists (select 1 from public.surveys s where s.id = survey_sections.survey_id and s.org_id = public.current_user_org_id())
);
create policy survey_sections_admin_write on public.survey_sections
for all using (public.is_dev_mode() or public.is_admin()) with check (public.is_dev_mode() or public.is_admin());

create policy survey_questions_select on public.survey_questions
for select using (
  public.is_dev_mode() OR exists (
    select 1 from public.survey_sections ss join public.surveys s on s.id = ss.survey_id
    where ss.id = survey_questions.section_id and s.org_id = public.current_user_org_id()
  )
);
create policy survey_questions_admin_write on public.survey_questions
for all using (public.is_dev_mode() or public.is_admin()) with check (public.is_dev_mode() or public.is_admin());

-- 9) Auditor branch assignments
create policy aba_select on public.auditor_branch_assignments
for select using (
  public.is_dev_mode() OR exists (
    select 1 from public.users u join public.branches b on b.org_id = u.org_id
    where u.id = auth.uid()
  )
);
create policy aba_admin_write on public.auditor_branch_assignments
for all using (public.is_dev_mode() or public.is_admin()) with check (public.is_dev_mode() or public.is_admin());

-- 10) Audits
create policy audits_select on public.audits
for select using (
  public.is_dev_mode() OR public.current_user_org_id() = audits.org_id
);
-- Assignee can update their audit when not locked; Admin can always update.
create policy audits_update_assignee_or_admin on public.audits
for update using (
  public.is_dev_mode()
  OR public.is_admin()
  OR (audits.assigned_to = auth.uid() AND audits.status NOT IN ('SUBMITTED','APPROVED'))
) with check (
  public.is_dev_mode()
  OR public.is_admin()
  OR (audits.assigned_to = auth.uid() AND audits.status NOT IN ('SUBMITTED','APPROVED'))
);
-- Insert/delete usually managed by jobs/admin; keep open for dev, admin otherwise.
create policy audits_insert_admin_or_dev on public.audits
for insert with check (public.is_dev_mode() or public.is_admin());
create policy audits_delete_admin_or_dev on public.audits
for delete using (public.is_dev_mode() or public.is_admin());

-- 11) Audit photos
create policy audit_photos_select on public.audit_photos
for select using (
  public.is_dev_mode() OR exists (
    select 1 from public.audits a where a.id = audit_photos.audit_id and a.org_id = public.current_user_org_id()
  )
);
create policy audit_photos_insert on public.audit_photos
for insert with check (
  public.is_dev_mode()
  OR public.is_admin()
  OR exists (
    select 1 from public.audits a where a.id = audit_photos.audit_id and (
      a.assigned_to = auth.uid() or public.is_admin()
    )
  )
);
create policy audit_photos_delete on public.audit_photos
for delete using (
  public.is_dev_mode()
  OR public.is_admin()
  OR exists (
    select 1 from public.audits a where a.id = audit_photos.audit_id and a.assigned_to = auth.uid()
  )
);

-- 12) Activity logs (read-only for clients; writes come from server flows)
create policy activity_logs_select on public.activity_logs
for select using (
  public.is_dev_mode() OR (
    exists (
      select 1 from public.users u where u.id = activity_logs.user_id and u.org_id = public.current_user_org_id()
    )
  )
);
create policy activity_logs_insert_dev on public.activity_logs
for insert with check (public.is_dev_mode());;

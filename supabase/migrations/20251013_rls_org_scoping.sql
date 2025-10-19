-- RLS and organization scoping for core tables
-- Helper predicates
create or replace function public.is_super_admin() returns boolean
language sql stable
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'SUPER_ADMIN'
  );
$$;

create or replace function public.is_admin() returns boolean
language sql stable
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role in ('ADMIN','SUPER_ADMIN')
  );
$$;

create or replace function public.my_org_id() returns uuid
language sql stable
as $$
  select u.org_id from public.users u where u.id = auth.uid();
$$;

-- SURVEYS --------------------------------------------------------------
alter table public.surveys enable row level security;

drop policy if exists surveys_select_on_org on public.surveys;
create policy surveys_select_on_org on public.surveys
for select using (
  is_super_admin() or org_id = my_org_id()
);

drop policy if exists surveys_insert_admin on public.surveys;
create policy surveys_insert_admin on public.surveys
for insert with check (
  is_admin() and org_id = my_org_id()
);

drop policy if exists surveys_update_admin on public.surveys;
create policy surveys_update_admin on public.surveys
for update using (
  is_admin() and org_id = my_org_id()
) with check (
  is_admin() and org_id = my_org_id()
);

drop policy if exists surveys_delete_admin on public.surveys;
create policy surveys_delete_admin on public.surveys
for delete using (
  is_admin() and org_id = my_org_id()
);

-- SURVEY SECTIONS ------------------------------------------------------
alter table public.survey_sections enable row level security;

drop policy if exists survey_sections_select_on_org on public.survey_sections;
create policy survey_sections_select_on_org on public.survey_sections
for select using (
  exists (
    select 1 from public.surveys s
    where s.id = survey_id and (is_super_admin() or s.org_id = my_org_id())
  )
);

drop policy if exists survey_sections_write_admin on public.survey_sections;
create policy survey_sections_write_admin on public.survey_sections
for all using (
  exists (
    select 1 from public.surveys s
    where s.id = survey_id and is_admin() and s.org_id = my_org_id()
  )
) with check (
  exists (
    select 1 from public.surveys s
    where s.id = survey_id and is_admin() and s.org_id = my_org_id()
  )
);

-- SURVEY QUESTIONS -----------------------------------------------------
alter table public.survey_questions enable row level security;

drop policy if exists survey_questions_select_on_org on public.survey_questions;
create policy survey_questions_select_on_org on public.survey_questions
for select using (
  exists (
    select 1 from public.surveys s
    where s.id = survey_id and (is_super_admin() or s.org_id = my_org_id())
  )
);

drop policy if exists survey_questions_write_admin on public.survey_questions;
create policy survey_questions_write_admin on public.survey_questions
for all using (
  exists (
    select 1 from public.surveys s
    where s.id = survey_id and is_admin() and s.org_id = my_org_id()
  )
) with check (
  exists (
    select 1 from public.surveys s
    where s.id = survey_id and is_admin() and s.org_id = my_org_id()
  )
);

-- BRANCHES -------------------------------------------------------------
alter table public.branches enable row level security;

drop policy if exists branches_select_on_org on public.branches;
create policy branches_select_on_org on public.branches
for select using (
  is_super_admin() or org_id = my_org_id()
);

drop policy if exists branches_write_admin on public.branches;
create policy branches_write_admin on public.branches
for all using (
  is_admin() and org_id = my_org_id()
) with check (
  is_admin() and org_id = my_org_id()
);

-- ZONES ----------------------------------------------------------------
alter table public.zones enable row level security;

drop policy if exists zones_select_on_org on public.zones;
create policy zones_select_on_org on public.zones
for select using (
  is_super_admin() or org_id = my_org_id()
);

drop policy if exists zones_write_admin on public.zones;
create policy zones_write_admin on public.zones
for all using (
  is_admin() and org_id = my_org_id()
) with check (
  is_admin() and org_id = my_org_id()
);

-- ZONE BRANCH LINKS ----------------------------------------------------
alter table public.zone_branches enable row level security;

drop policy if exists zone_branches_select_on_org on public.zone_branches;
create policy zone_branches_select_on_org on public.zone_branches
for select using (
  exists (
    select 1 from public.zones z
    where z.id = zone_id and (is_super_admin() or z.org_id = my_org_id())
  )
);

drop policy if exists zone_branches_write_admin on public.zone_branches;
create policy zone_branches_write_admin on public.zone_branches
for all using (
  exists (
    select 1 from public.zones z
    where z.id = zone_id and is_admin() and z.org_id = my_org_id()
  )
) with check (
  exists (
    select 1 from public.zones z
    where z.id = zone_id and is_admin() and z.org_id = my_org_id()
  )
);

-- AUDITOR ASSIGNMENTS --------------------------------------------------
alter table public.auditor_assignments enable row level security;

drop policy if exists auditor_assignments_select_on_org on public.auditor_assignments;
create policy auditor_assignments_select_on_org on public.auditor_assignments
for select using (
  exists (
    select 1 from public.users u
    where u.id = user_id and (is_super_admin() or u.org_id = my_org_id())
  )
);

drop policy if exists auditor_assignments_write_admin on public.auditor_assignments;
create policy auditor_assignments_write_admin on public.auditor_assignments
for all using (
  exists (
    select 1 from public.users u
    where u.id = user_id and is_admin() and u.org_id = my_org_id()
  )
) with check (
  exists (
    select 1 from public.users u
    where u.id = user_id and is_admin() and u.org_id = my_org_id()
  )
);

-- AUDITS ---------------------------------------------------------------
alter table public.audits enable row level security;

drop policy if exists audits_select_on_org on public.audits;
create policy audits_select_on_org on public.audits
for select using (
  is_super_admin() or org_id = my_org_id()
);

drop policy if exists audits_insert_admin on public.audits;
create policy audits_insert_admin on public.audits
for insert with check (
  is_admin() and org_id = my_org_id()
);

drop policy if exists audits_update_admin_or_assignee on public.audits;
create policy audits_update_admin_or_assignee on public.audits
for update using (
  (is_admin() and org_id = my_org_id()) or (assigned_to = auth.uid() and org_id = my_org_id())
) with check (
  (is_admin() and org_id = my_org_id()) or (assigned_to = auth.uid() and org_id = my_org_id())
);

drop policy if exists audits_delete_admin on public.audits;
create policy audits_delete_admin on public.audits
for delete using (
  is_admin() and org_id = my_org_id()
);

-- AUDIT PHOTOS ---------------------------------------------------------
alter table public.audit_photos enable row level security;

drop policy if exists audit_photos_select_on_org on public.audit_photos;
create policy audit_photos_select_on_org on public.audit_photos
for select using (
  exists (
    select 1 from public.audits a
    where a.id = audit_id and (is_super_admin() or a.org_id = my_org_id())
  )
);

drop policy if exists audit_photos_write_admin_or_assignee on public.audit_photos;
create policy audit_photos_write_admin_or_assignee on public.audit_photos
for all using (
  exists (
    select 1 from public.audits a
    where a.id = audit_id and (
      (is_admin() and a.org_id = my_org_id()) or
      (a.assigned_to = auth.uid() and a.org_id = my_org_id())
    )
  )
) with check (
  exists (
    select 1 from public.audits a
    where a.id = audit_id and (
      (is_admin() and a.org_id = my_org_id()) or
      (a.assigned_to = auth.uid() and a.org_id = my_org_id())
    )
  )
);

-- USERS (app table) ----------------------------------------------------
alter table public.users enable row level security;

drop policy if exists users_select_self_or_org on public.users;
create policy users_select_self_or_org on public.users
for select using (
  is_super_admin() or id = auth.uid() or org_id = my_org_id()
);

drop policy if exists users_update_self_or_admin on public.users;
create policy users_update_self_or_admin on public.users
for update using (
  id = auth.uid() or (is_admin() and org_id = my_org_id())
) with check (
  id = auth.uid() or (is_admin() and org_id = my_org_id())
);

drop policy if exists users_insert_super_admin on public.users;
create policy users_insert_super_admin on public.users
for insert with check (
  is_super_admin()
);

drop policy if exists users_delete_super_admin on public.users;
create policy users_delete_super_admin on public.users
for delete using (
  is_super_admin()
);

-- ORGANIZATIONS --------------------------------------------------------
alter table public.organizations enable row level security;

drop policy if exists organizations_select_self_or_super on public.organizations;
create policy organizations_select_self_or_super on public.organizations
for select using (
  is_super_admin() or id = my_org_id()
);

drop policy if exists organizations_update_admin on public.organizations;
create policy organizations_update_admin on public.organizations
for update using (
  is_admin() and id = my_org_id()
) with check (
  is_admin() and id = my_org_id()
);

drop policy if exists organizations_insert_super_admin on public.organizations;
create policy organizations_insert_super_admin on public.organizations
for insert with check (
  is_super_admin()
);

drop policy if exists organizations_delete_super_admin on public.organizations;
create policy organizations_delete_super_admin on public.organizations
for delete using (
  is_super_admin()
);

-- OPTIONAL: zone_assignments if present --------------------------------
DO $$
BEGIN
  IF to_regclass('public.zone_assignments') IS NOT NULL THEN
    EXECUTE 'alter table public.zone_assignments enable row level security';
    EXECUTE 'drop policy if exists zone_assignments_select_on_org on public.zone_assignments';
    EXECUTE 'create policy zone_assignments_select_on_org on public.zone_assignments for select using (exists (select 1 from public.zones z where z.id = zone_id and (is_super_admin() or z.org_id = my_org_id())))';
    EXECUTE 'drop policy if exists zone_assignments_write_admin on public.zone_assignments';
    EXECUTE 'create policy zone_assignments_write_admin on public.zone_assignments for all using (exists (select 1 from public.zones z where z.id = zone_id and is_admin() and z.org_id = my_org_id())) with check (exists (select 1 from public.zones z where z.id = zone_id and is_admin() and z.org_id = my_org_id()))';
  END IF;
END $$;

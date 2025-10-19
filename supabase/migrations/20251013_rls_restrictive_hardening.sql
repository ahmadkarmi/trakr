-- Restrictive admin-only write policies to harden against permissive legacy policies
-- These ensure that even if permissive org-scoped policies exist, non-admin roles cannot write.

-- SURVEYS --------------------------------------------------------------
alter table public.surveys enable row level security;

drop policy if exists surveys_insert_admin_restrict on public.surveys;
create policy surveys_insert_admin_restrict on public.surveys
as restrictive
for insert to public
with check (is_admin() and org_id = my_org_id());

drop policy if exists surveys_update_admin_restrict on public.surveys;
create policy surveys_update_admin_restrict on public.surveys
as restrictive
for update to public
using (is_admin() and org_id = my_org_id())
with check (is_admin() and org_id = my_org_id());

drop policy if exists surveys_delete_admin_restrict on public.surveys;
create policy surveys_delete_admin_restrict on public.surveys
as restrictive
for delete to public
using (is_admin() and org_id = my_org_id());

-- SURVEY SECTIONS ------------------------------------------------------
alter table public.survey_sections enable row level security;

drop policy if exists survey_sections_write_admin_restrict on public.survey_sections;
create policy survey_sections_write_admin_restrict on public.survey_sections
as restrictive
for all to public
using (
  exists (
    select 1 from public.surveys s
    where s.id = survey_id and is_admin() and s.org_id = my_org_id()
  )
)
with check (
  exists (
    select 1 from public.surveys s
    where s.id = survey_id and is_admin() and s.org_id = my_org_id()
  )
);

-- SURVEY QUESTIONS -----------------------------------------------------
alter table public.survey_questions enable row level security;

drop policy if exists survey_questions_write_admin_restrict on public.survey_questions;
create policy survey_questions_write_admin_restrict on public.survey_questions
as restrictive
for all to public
using (
  exists (
    select 1 from public.surveys s
    where s.id = survey_id and is_admin() and s.org_id = my_org_id()
  )
)
with check (
  exists (
    select 1 from public.surveys s
    where s.id = survey_id and is_admin() and s.org_id = my_org_id()
  )
);

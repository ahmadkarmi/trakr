-- Add UNLIMITED value to audit_frequency enum for parity with app
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'audit_frequency' AND e.enumlabel = 'UNLIMITED'
  ) THEN
    ALTER TYPE public.audit_frequency ADD VALUE 'UNLIMITED';
  END IF;
END $$;

-- Dev write policies for zones & surveys & profiles & org settings
-- Zones
alter table public.zones enable row level security;
drop policy if exists dev_ins_zones on public.zones; create policy dev_ins_zones on public.zones for insert with check (true);
drop policy if exists dev_upd_zones on public.zones; create policy dev_upd_zones on public.zones for update using (true) with check (true);
drop policy if exists dev_del_zones on public.zones; create policy dev_del_zones on public.zones for delete using (true);

-- Zone branches
alter table public.zone_branches enable row level security;
drop policy if exists dev_upd_zone_branches on public.zone_branches; create policy dev_upd_zone_branches on public.zone_branches for update using (true) with check (true);
-- insert/delete already handled earlier for zone_branches

-- Surveys
alter table public.surveys enable row level security;
drop policy if exists dev_ins_surveys on public.surveys; create policy dev_ins_surveys on public.surveys for insert with check (true);
drop policy if exists dev_upd_surveys on public.surveys; create policy dev_upd_surveys on public.surveys for update using (true) with check (true);
drop policy if exists dev_del_surveys on public.surveys; create policy dev_del_surveys on public.surveys for delete using (true);

alter table public.survey_sections enable row level security;
drop policy if exists dev_ins_sections on public.survey_sections; create policy dev_ins_sections on public.survey_sections for insert with check (true);
drop policy if exists dev_upd_sections on public.survey_sections; create policy dev_upd_sections on public.survey_sections for update using (true) with check (true);
drop policy if exists dev_del_sections on public.survey_sections; create policy dev_del_sections on public.survey_sections for delete using (true);

alter table public.survey_questions enable row level security;
drop policy if exists dev_ins_questions on public.survey_questions; create policy dev_ins_questions on public.survey_questions for insert with check (true);
drop policy if exists dev_upd_questions on public.survey_questions; create policy dev_upd_questions on public.survey_questions for update using (true) with check (true);
drop policy if exists dev_del_questions on public.survey_questions; create policy dev_del_questions on public.survey_questions for delete using (true);

-- Users: allow update for profile fields in dev
alter table public.users enable row level security;
drop policy if exists dev_upd_users on public.users; create policy dev_upd_users on public.users for update using (true) with check (true);

-- Organizations: allow update of settings in dev
alter table public.organizations enable row level security;
drop policy if exists dev_upd_orgs on public.organizations; create policy dev_upd_orgs on public.organizations for update using (true) with check (true);
;

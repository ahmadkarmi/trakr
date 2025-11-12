-- Development write policies to support incremental migration
-- NOTE: TEMPORARY. Tighten before production.

-- Audits: allow updates in dev
alter table public.audits enable row level security;
drop policy if exists dev_update_all_audits on public.audits;
create policy dev_update_all_audits on public.audits for update using (true) with check (true);

-- Auditor branch assignments: allow insert/delete in dev
alter table public.auditor_branch_assignments enable row level security;
drop policy if exists dev_ins_assignments on public.auditor_branch_assignments;
create policy dev_ins_assignments on public.auditor_branch_assignments for insert with check (true);
drop policy if exists dev_del_assignments on public.auditor_branch_assignments;
create policy dev_del_assignments on public.auditor_branch_assignments for delete using (true);

-- Zone assignments: allow insert/delete in dev
alter table public.zone_assignments enable row level security;
drop policy if exists dev_ins_zone_assignments on public.zone_assignments;
create policy dev_ins_zone_assignments on public.zone_assignments for insert with check (true);
drop policy if exists dev_del_zone_assignments on public.zone_assignments;
create policy dev_del_zone_assignments on public.zone_assignments for delete using (true);

-- Activity logs: allow insert in dev (if we add logging later)
alter table public.activity_logs enable row level security;
drop policy if exists dev_ins_logs on public.activity_logs;
create policy dev_ins_logs on public.activity_logs for insert with check (true);
;

-- Enable RLS and add permissive read policies for development
-- Note: We will tighten these policies later to enforce business rules.

-- Ensure roles can call functions
grant usage on schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;

-- Organizations
alter table public.organizations enable row level security;
drop policy if exists dev_read_all_organizations on public.organizations;
create policy dev_read_all_organizations on public.organizations for select using (true);

-- Users
alter table public.users enable row level security;
drop policy if exists dev_read_all_users on public.users;
create policy dev_read_all_users on public.users for select using (true);

-- Branches
alter table public.branches enable row level security;
drop policy if exists dev_read_all_branches on public.branches;
create policy dev_read_all_branches on public.branches for select using (true);

-- Zones
alter table public.zones enable row level security;
drop policy if exists dev_read_all_zones on public.zones;
create policy dev_read_all_zones on public.zones for select using (true);

-- Zone branches
alter table public.zone_branches enable row level security;
drop policy if exists dev_read_all_zone_branches on public.zone_branches;
create policy dev_read_all_zone_branches on public.zone_branches for select using (true);

-- Audits
alter table public.audits enable row level security;
drop policy if exists dev_read_all_audits on public.audits;
create policy dev_read_all_audits on public.audits for select using (true);

-- Manual auditor branch assignments (cycle-scoped)
alter table public.auditor_branch_assignments enable row level security;
drop policy if exists dev_read_all_assignments on public.auditor_branch_assignments;
create policy dev_read_all_assignments on public.auditor_branch_assignments for select using (true);

-- Zone assignments
alter table public.zone_assignments enable row level security;
drop policy if exists dev_read_all_zone_assignments on public.zone_assignments;
create policy dev_read_all_zone_assignments on public.zone_assignments for select using (true);
;

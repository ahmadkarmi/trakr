-- Performance indexes for auditor coverage lookups
-- Arrays: GIN supports membership and @> contains operations

create index if not exists idx_auditor_assignments_branch_ids_gin
  on public.auditor_assignments using gin (branch_ids);

create index if not exists idx_auditor_assignments_zone_ids_gin
  on public.auditor_assignments using gin (zone_ids);

-- Zone links
create index if not exists idx_zone_branches_branch
  on public.zone_branches (branch_id);

create index if not exists idx_zone_branches_zone
  on public.zone_branches (zone_id);

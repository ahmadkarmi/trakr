-- Add is_active to branches (default false). A branch may only be activated if it has at least one auditor assigned (enforced at app layer).
alter table public.branches
  add column if not exists is_active boolean not null default false;

create index if not exists idx_branches_org_active on public.branches (org_id, is_active);

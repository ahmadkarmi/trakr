-- Extend activity_logs with structured fields for richer filtering
alter table public.activity_logs
  add column if not exists survey_id uuid null,
  add column if not exists branch_id uuid null;

-- Helpful indexes
create index if not exists idx_activity_logs_org_action_created_at on public.activity_logs (org_id, action, created_at desc);
create index if not exists idx_activity_logs_branch on public.activity_logs (branch_id);
create index if not exists idx_activity_logs_survey on public.activity_logs (survey_id);

-- Backfill: deactivate any active branches without auditor coverage
-- Uses branch_has_auditor_coverage() introduced in coverage_policy migration

update public.branches b
set is_active = false
where b.is_active = true
  and not public.branch_has_auditor_coverage(b.id);

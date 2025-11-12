-- Backfill provenance fields for existing audits
-- Idempotent and conservative heuristics

-- 1) Mark likely system-scheduled WEEKLY audits
-- Heuristic: surveys.frequency = WEEKLY, due_at = period_end, and period range ≈ 7 days
UPDATE audits a
SET created_origin = 'SYSTEM_SCHEDULED'
WHERE a.created_origin IS NULL
  AND a.due_at IS NOT NULL
  AND a.period_end IS NOT NULL
  AND a.period_start IS NOT NULL
  AND a.due_at = a.period_end
  AND (a.period_end - a.period_start) BETWEEN interval '6 days' AND interval '8 days'
  AND EXISTS (
    SELECT 1 FROM surveys s
    WHERE s.id = a.survey_id AND s.frequency = 'WEEKLY'
  );

-- 2) Backfill started_by/started_at when missing and audit progressed
UPDATE audits a
SET started_by = COALESCE(a.started_by, a.submitted_by, a.assigned_to),
    started_at = COALESCE(a.started_at, a.created_at)
WHERE a.started_by IS NULL
  AND a.status IN ('IN_PROGRESS','COMPLETED','SUBMITTED','APPROVED','REJECTED');

-- 3) Backfill completed_by/completed_at when missing and audit effectively complete/submitted/approved/rejected
UPDATE audits a
SET completed_by = COALESCE(a.completed_by, a.submitted_by, a.assigned_to),
    completed_at = COALESCE(a.completed_at, a.submitted_at, a.updated_at)
WHERE a.completed_by IS NULL
  AND a.status IN ('COMPLETED','SUBMITTED','APPROVED','REJECTED');

-- 4) Ensure submitted_by exists for SUBMITTED audits (if historically missing)
UPDATE audits a
SET submitted_by = COALESCE(a.submitted_by, a.assigned_to),
    submitted_at = COALESCE(a.submitted_at, a.updated_at)
WHERE a.status = 'SUBMITTED' AND a.submitted_by IS NULL;

-- Optional: mark created_origin as 'API' for rows still NULL (non-system, unknown origin)
UPDATE audits a
SET created_origin = 'API'
WHERE a.created_origin IS NULL;;

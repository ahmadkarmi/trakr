-- Add applicable_branch_ids to surveys (JSONB array of branch IDs)
ALTER TABLE surveys
ADD COLUMN IF NOT EXISTS applicable_branch_ids jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Optional index for containment queries if used later
-- (Not required for current app-side filtering, but inexpensive.)
CREATE INDEX IF NOT EXISTS idx_surveys_applicable_branch_ids
  ON surveys USING GIN (applicable_branch_ids);

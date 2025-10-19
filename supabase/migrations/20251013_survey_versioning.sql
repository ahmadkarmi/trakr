-- Survey versioning migration
-- 1) Add version columns to section/question tables (default 1)
ALTER TABLE survey_sections
ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

ALTER TABLE survey_questions
ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- 2) Backfill existing rows to match their parent survey's current version
UPDATE survey_sections s
SET version = COALESCE((SELECT version FROM surveys sv WHERE sv.id = s.survey_id), 1)
WHERE s.version IS DISTINCT FROM COALESCE((SELECT version FROM surveys sv WHERE sv.id = s.survey_id), 1);

UPDATE survey_questions q
SET version = COALESCE((SELECT version FROM surveys sv WHERE sv.id = q.survey_id), 1)
WHERE q.version IS DISTINCT FROM COALESCE((SELECT version FROM surveys sv WHERE sv.id = q.survey_id), 1);

-- 3) Helpful indexes for versioned reads
CREATE INDEX IF NOT EXISTS idx_survey_sections_versioned
  ON survey_sections (survey_id, version, order_num);

CREATE INDEX IF NOT EXISTS idx_survey_questions_versioned
  ON survey_questions (survey_id, version, section_id, order_num);

-- Note: Immutability of published content is enforced at the application layer for now.
-- Future: add triggers to prevent modifying rows of older versions if needed.

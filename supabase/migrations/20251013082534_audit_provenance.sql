-- Audit provenance fields and triggers
-- Adds created/started/completed actor fields and triggers to set them

-- 1) Columns
ALTER TABLE audits
  ADD COLUMN IF NOT EXISTS created_by uuid NULL,
  ADD COLUMN IF NOT EXISTS created_origin text NULL,
  ADD COLUMN IF NOT EXISTS started_by uuid NULL,
  ADD COLUMN IF NOT EXISTS started_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS completed_by uuid NULL,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz NULL;

-- 2) Helper: map auth.uid() -> users.id
CREATE OR REPLACE FUNCTION public._actor_user_id()
RETURNS uuid AS $$
DECLARE
  v_user uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT id INTO v_user FROM users WHERE auth_user_id = auth.uid();
  RETURN v_user;
END; $$ LANGUAGE plpgsql SECURITY INVOKER;

-- 3) Trigger: set created provenance on INSERT
CREATE OR REPLACE FUNCTION public.set_audit_created_provenance()
RETURNS trigger AS $$
BEGIN
  -- If scheduler/API provided created_origin explicitly, keep it.
  IF NEW.created_origin IS NULL THEN
    IF auth.uid() IS NOT NULL THEN
      NEW.created_by := COALESCE(NEW.created_by, public._actor_user_id());
      NEW.created_origin := 'USER';
    ELSE
      NEW.created_origin := COALESCE(NEW.created_origin, 'API');
    END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY INVOKER;

DROP TRIGGER IF EXISTS trg_audits_before_insert_provenance ON audits;
CREATE TRIGGER trg_audits_before_insert_provenance
BEFORE INSERT ON audits
FOR EACH ROW EXECUTE FUNCTION public.set_audit_created_provenance();

-- 4) Trigger: set started/completed/submitted provenance on status transitions
CREATE OR REPLACE FUNCTION public.set_audit_status_provenance()
RETURNS trigger AS $$
BEGIN
  -- Started: DRAFT/REJECTED -> IN_PROGRESS
  IF NEW.status = 'IN_PROGRESS' AND (OLD.status IN ('DRAFT','REJECTED')) THEN
    IF NEW.started_by IS NULL THEN
      NEW.started_by := public._actor_user_id();
    END IF;
    IF NEW.started_at IS NULL THEN
      NEW.started_at := now();
    END IF;
  END IF;

  -- Completed: any -> COMPLETED
  IF NEW.status = 'COMPLETED' AND (OLD.status IS DISTINCT FROM 'COMPLETED') THEN
    IF NEW.completed_by IS NULL THEN
      NEW.completed_by := public._actor_user_id();
    END IF;
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    END IF;
  END IF;

  -- Submitted: ensure submitted_by/at if missing
  IF NEW.status = 'SUBMITTED' AND (OLD.status IS DISTINCT FROM 'SUBMITTED') THEN
    IF NEW.submitted_by IS NULL THEN
      NEW.submitted_by := public._actor_user_id();
    END IF;
    IF NEW.submitted_at IS NULL THEN
      NEW.submitted_at := now();
    END IF;
  END IF;

  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY INVOKER;

DROP TRIGGER IF EXISTS trg_audits_before_update_provenance ON audits;
CREATE TRIGGER trg_audits_before_update_provenance
BEFORE UPDATE OF status ON audits
FOR EACH ROW EXECUTE FUNCTION public.set_audit_status_provenance();

-- 5) Optional indexes
CREATE INDEX IF NOT EXISTS idx_audits_started_by ON audits(started_by);
CREATE INDEX IF NOT EXISTS idx_audits_completed_by ON audits(completed_by);
CREATE INDEX IF NOT EXISTS idx_audits_created_by ON audits(created_by);;

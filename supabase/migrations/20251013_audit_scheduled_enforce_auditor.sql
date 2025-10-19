-- Enforce: SYSTEM_SCHEDULED audits must be assigned to an AUDITOR
CREATE OR REPLACE FUNCTION public.enforce_system_scheduled_auditor()
RETURNS trigger AS $$
DECLARE
  v_role text;
BEGIN
  IF NEW.created_origin = 'SYSTEM_SCHEDULED' THEN
    IF NEW.assigned_to IS NULL THEN
      RAISE EXCEPTION 'SYSTEM_SCHEDULED audits must have assigned_to set to an auditor';
    END IF;
    SELECT role INTO v_role FROM users WHERE id = NEW.assigned_to;
    IF v_role IS DISTINCT FROM 'AUDITOR' THEN
      RAISE EXCEPTION 'SYSTEM_SCHEDULED audits must be assigned to an AUDITOR (got %)', v_role;
    END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY INVOKER;

DROP TRIGGER IF EXISTS trg_audits_before_insert_enforce_system ON audits;
CREATE TRIGGER trg_audits_before_insert_enforce_system
BEFORE INSERT ON audits
FOR EACH ROW EXECUTE FUNCTION public.enforce_system_scheduled_auditor();

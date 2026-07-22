-- The audits UPDATE RLS policy's WITH CHECK imposes no status constraint, so a
-- raw client UPDATE lets an AUDITOR self-approve their own audit
-- (status->APPROVED) and a BRANCH_MANAGER rewrite the status of a finalized
-- audit -- both bypassing set_audit_approval's guards (self-approval block,
-- WHERE status='SUBMITTED', signature capture). WITH CHECK cannot see OLD.status
-- to express "legal transition", so enforce the state machine with a trigger.
-- SECURITY INVOKER (not DEFINER) so current_user reflects the real caller:
-- raw PostgREST calls run as 'authenticated'; the SECURITY DEFINER RPCs
-- (submit_audit, set_audit_approval) run as 'postgres' and pass through, as do
-- service_role/admin paths. Verified via role-switched rollback transactions:
-- auditor DRAFT->IN_PROGRESS allowed; auditor->APPROVED blocked; BM raw approve
-- blocked; postgres/RPC path allowed.
CREATE OR REPLACE FUNCTION public.enforce_audit_status_transition()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public', 'pg_temp' AS $fn$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW; -- content-only edits are not status transitions
  END IF;
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW; -- SECURITY DEFINER RPCs / service_role / admin-cli
  END IF;
  IF public.current_user_role() = 'AUDITOR'::user_role THEN
    IF NEW.status = ANY (ARRAY['DRAFT','IN_PROGRESS','COMPLETED']::audit_status[]) THEN
      RETURN NEW; -- auditor edit/complete; never SUBMITTED/APPROVED/REJECTED via raw update
    END IF;
  ELSIF public.current_user_role() = ANY (ARRAY['ADMIN','SUPER_ADMIN']::user_role[]) THEN
    RETURN NEW; -- trusted org operators
  END IF;
  RAISE EXCEPTION 'Illegal audit status transition % -> % via direct update; decisions must go through submit_audit / set_audit_approval', OLD.status, NEW.status
    USING ERRCODE = '42501';
END $fn$;

DROP TRIGGER IF EXISTS trg_enforce_audit_status_transition ON public.audits;
CREATE TRIGGER trg_enforce_audit_status_transition
  BEFORE UPDATE ON public.audits
  FOR EACH ROW EXECUTE FUNCTION public.enforce_audit_status_transition();

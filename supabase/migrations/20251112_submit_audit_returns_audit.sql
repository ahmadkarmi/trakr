-- Ensure submit_audit RPC returns the updated audit row for client consumption
-- and enforces basic state transition rules for submission.

set check_function_bodies = off;

create or replace function public.submit_audit(
  p_audit_id uuid,
  p_submitted_by uuid
)
returns public.audits
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_result public.audits;
begin
  -- Attempt state transition to SUBMITTED when allowed.
  update public.audits
     set status = 'SUBMITTED',
         submitted_by = coalesce(p_submitted_by, submitted_by),
         submitted_at = v_now,
         updated_at = v_now
   where id = p_audit_id
     and status in ('DRAFT', 'IN_PROGRESS', 'COMPLETED')
  returning * into v_result;

  if not found then
    -- If no update occurred, either the audit does not exist or is in a state
    -- that should not transition. Return the existing row for caller context or
    -- raise if it is missing entirely.
    select * into v_result from public.audits where id = p_audit_id;

    if not found then
      raise exception 'Audit % not found', p_audit_id using errcode = 'P0002';
    end if;
  end if;

  return v_result;
end;
$$;

grant execute on function public.submit_audit(uuid, uuid) to authenticated;

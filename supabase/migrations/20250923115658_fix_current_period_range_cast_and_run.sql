-- Fix current_period_range to cast week_starts_on to smallint
create or replace function public.current_period_range(org_id uuid, freq public.audit_frequency)
returns table(period_start timestamptz, period_end timestamptz) language plpgsql stable as $$
declare v_ws smallint;
begin
  select week_starts_on::smallint into v_ws from public.organizations where id = org_id;
  if freq = 'DAILY' then
    period_start := date_trunc('day', now());
    period_end := (date_trunc('day', now()) + interval '1 day') - interval '1 microsecond';
  elsif freq = 'WEEKLY' then
    period_start := public.start_of_week(now(), coalesce(v_ws, 0::smallint));
    period_end := period_start + interval '6 days 23:59:59.999999';
  elsif freq = 'MONTHLY' then
    period_start := date_trunc('month', now());
    period_end := (date_trunc('month', now()) + interval '1 month') - interval '1 microsecond';
  elsif freq = 'QUARTERLY' then
    period_start := date_trunc('quarter', now());
    period_end := (date_trunc('quarter', now()) + interval '3 months') - interval '1 microsecond';
  else
    -- default weekly
    period_start := public.start_of_week(now(), coalesce(v_ws, 0::smallint));
    period_end := period_start + interval '6 days 23:59:59.999999';
  end if;
  return next;
end;$$;

-- Re-run scheduling now
select public.ensure_current_period_scheduling();;

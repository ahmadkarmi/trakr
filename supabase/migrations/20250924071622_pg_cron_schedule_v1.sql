-- Ensure pg_cron extension exists and schedule daily run of the scheduler
create extension if not exists pg_cron with schema extensions;
select cron.schedule('trakr_current_period_scheduler', '0 3 * * *', $$select public.ensure_current_period_scheduling()$$);
;

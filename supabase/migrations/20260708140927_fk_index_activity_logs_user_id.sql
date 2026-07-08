-- Missed in the fk_indexes_and_dedupe migration; added as a quick follow-up.
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs (user_id);

-- Exactly-once guarantee for the offline photo outbox. Replay uses a deterministic
-- object path (audits/<auditId>/outbox-<clientId>); the app's pre-insert existence
-- check is a fast path but is NOT atomic (two tabs sharing IndexedDB can both flush
-- the same record). A unique index on url makes the database the arbiter: the losing
-- writer gets 23505 and reads back the winning row instead of inserting a duplicate.
-- Random-path (online) uploads already have unique timestamp+random paths, so this
-- never rejects a legitimate distinct photo.
CREATE UNIQUE INDEX IF NOT EXISTS audit_photos_url_key ON public.audit_photos (url);

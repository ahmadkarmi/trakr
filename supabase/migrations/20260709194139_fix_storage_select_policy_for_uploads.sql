-- 20260703150433_storage_prod_policies dropped every SELECT policy on
-- storage.objects, reasoning that reads go through public bucket URLs and
-- omitting SELECT closes the listing/enumeration advisor warning. But the
-- storage API's upload path itself needs SELECT on the object row it inserts
-- (insert-returning / upsert existence check), so every authenticated upload
-- (avatars, signatures, audit photos) has failed with an RLS violation since
-- then. Restore SELECT for authenticated users only, scoped to the two app
-- media buckets - anon listing/enumeration stays blocked, preserving the
-- original hardening goal.
CREATE POLICY app_media_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id IN ('audit-photos', 'profile-media'));

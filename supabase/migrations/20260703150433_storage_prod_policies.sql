-- ============================================================================
-- Production storage policies
-- The dev_* generation granted anon INSERT/UPDATE/DELETE on both buckets —
-- anyone holding the public anon key could upload, overwrite, or delete
-- photos. No non-dev policies existed, so scoped replacements are created
-- here (dropping without replacing would break uploads).
--
-- App usage (supabaseApi.ts): upload with upsert:true (INSERT + UPDATE),
-- reads via public bucket URLs (no SELECT policy needed — omitting it also
-- closes the listing/enumeration advisor warning), no deletes.
-- ============================================================================

DROP POLICY IF EXISTS dev_audit_photos_select ON storage.objects;
DROP POLICY IF EXISTS dev_audit_photos_insert ON storage.objects;
DROP POLICY IF EXISTS dev_audit_photos_update ON storage.objects;
DROP POLICY IF EXISTS dev_audit_photos_delete ON storage.objects;
DROP POLICY IF EXISTS dev_select_audit_photos ON storage.objects;
DROP POLICY IF EXISTS dev_insert_audit_photos ON storage.objects;
DROP POLICY IF EXISTS dev_delete_audit_photos ON storage.objects;
DROP POLICY IF EXISTS dev_select_profile_media ON storage.objects;
DROP POLICY IF EXISTS dev_insert_profile_media ON storage.objects;
DROP POLICY IF EXISTS dev_delete_profile_media ON storage.objects;
DROP POLICY IF EXISTS dev_profile_media_select ON storage.objects;
DROP POLICY IF EXISTS dev_profile_media_insert ON storage.objects;
DROP POLICY IF EXISTS dev_profile_media_read ON storage.objects;
DROP POLICY IF EXISTS dev_profile_media_update ON storage.objects;
DROP POLICY IF EXISTS dev_profile_media_delete ON storage.objects;

CREATE POLICY app_media_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('audit-photos', 'profile-media'));

CREATE POLICY app_media_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id IN ('audit-photos', 'profile-media'))
  WITH CHECK (bucket_id IN ('audit-photos', 'profile-media'));

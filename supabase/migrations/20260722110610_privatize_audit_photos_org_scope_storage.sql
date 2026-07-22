-- Storage isolation, Phase 1a (audit-photos). The audit-photos bucket was
-- public=true, so audit evidence was internet-readable by URL; and the only
-- storage.objects policies were scoped by bucket_id alone (no org/owner
-- predicate), so any authenticated user of org A could read/overwrite org B's
-- photos. Privatize the bucket and org-scope object access via the
-- audits/<auditId>/... path segment. profile-media stays public for now
-- (avatars/signatures handled in the follow-up 1a-2).

-- Does this audit belong to the caller's org? SECURITY DEFINER so the check
-- bypasses the audits row-level policy: an auditor cannot SELECT an unassigned
-- org audit, but storage authorization must key off the audit's org regardless
-- of row visibility. Mirrors current_user_org_id()'s definer pattern.
CREATE OR REPLACE FUNCTION public.storage_audit_in_my_org(p_audit_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.audits a WHERE a.id = p_audit_id AND a.org_id = public.current_user_org_id());
$$;
-- REVOKE FROM anon alone leaves the implicit PUBLIC grant, so revoke PUBLIC.
-- authenticated keeps EXECUTE (the RLS policy evaluates the helper as the caller).
REVOKE EXECUTE ON FUNCTION public.storage_audit_in_my_org(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storage_audit_in_my_org(uuid) TO authenticated;

-- A public bucket is internet-readable regardless of RLS; privatizing is the
-- only real fix for read isolation.
UPDATE storage.buckets SET public=false WHERE id='audit-photos';

-- Narrow the bucket-only shared policies to profile-media; add org-scoped
-- audit-photos policies. The regex guards the ::uuid cast so a malformed path
-- fails closed (AND short-circuits) instead of erroring.
DROP POLICY IF EXISTS app_media_select ON storage.objects;
DROP POLICY IF EXISTS app_media_insert ON storage.objects;
DROP POLICY IF EXISTS app_media_update ON storage.objects;
CREATE POLICY app_media_select ON storage.objects FOR SELECT TO authenticated USING (bucket_id='profile-media');
CREATE POLICY app_media_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='profile-media');
CREATE POLICY app_media_update ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='profile-media') WITH CHECK (bucket_id='profile-media');

CREATE POLICY audit_photos_select ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id='audit-photos' AND (storage.foldername(name))[2] ~ '^[0-9a-fA-F-]{36}$'
  AND public.storage_audit_in_my_org(((storage.foldername(name))[2])::uuid));
CREATE POLICY audit_photos_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id='audit-photos' AND (storage.foldername(name))[2] ~ '^[0-9a-fA-F-]{36}$'
  AND public.storage_audit_in_my_org(((storage.foldername(name))[2])::uuid));
CREATE POLICY audit_photos_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id='audit-photos' AND (storage.foldername(name))[2] ~ '^[0-9a-fA-F-]{36}$'
         AND public.storage_audit_in_my_org(((storage.foldername(name))[2])::uuid))
  WITH CHECK (bucket_id='audit-photos' AND (storage.foldername(name))[2] ~ '^[0-9a-fA-F-]{36}$'
         AND public.storage_audit_in_my_org(((storage.foldername(name))[2])::uuid));
CREATE POLICY audit_photos_delete ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id='audit-photos' AND (storage.foldername(name))[2] ~ '^[0-9a-fA-F-]{36}$'
  AND public.storage_audit_in_my_org(((storage.foldername(name))[2])::uuid));

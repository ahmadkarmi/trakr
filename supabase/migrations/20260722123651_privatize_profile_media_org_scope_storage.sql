-- Storage isolation, Phase 1a-2 (profile-media). Same exposure as audit-photos:
-- the bucket was public=true (internet-readable) with bucket-only policies. Avatars
-- and signatures are lower-sensitivity than audit evidence but still user data; a
-- signature image is an approval artifact. Privatize + org-scope. The app switches
-- to the <prefix>/<userId>/... path scheme (a clean folder segment) -- safe because
-- there is zero stored profile-media data.

-- Is this user in the caller's org? SECURITY DEFINER bypasses the users row-level
-- policy (a caller can only SELECT same-org users anyway, but the definer form keeps
-- the check independent of row visibility and mirrors storage_audit_in_my_org).
CREATE OR REPLACE FUNCTION public.storage_user_in_my_org(p_user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.users u WHERE u.id = p_user_id AND u.org_id = public.current_user_org_id());
$$;
-- Supabase default privileges grant EXECUTE to anon explicitly on new public
-- functions, so revoke BOTH the implicit PUBLIC grant and the explicit anon grant.
REVOKE EXECUTE ON FUNCTION public.storage_user_in_my_org(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.storage_user_in_my_org(uuid) TO authenticated;

UPDATE storage.buckets SET public=false WHERE id='profile-media';

-- Replace the (now profile-media-only) bucket-scoped policies with org/owner scoping.
DROP POLICY IF EXISTS app_media_select ON storage.objects;
DROP POLICY IF EXISTS app_media_insert ON storage.objects;
DROP POLICY IF EXISTS app_media_update ON storage.objects;
-- SELECT: any authenticated user may view (sign) profile media of a user in their org
-- (admins/managers see org members' avatars & signatures).
CREATE POLICY profile_media_select ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id='profile-media' AND (storage.foldername(name))[2] ~ '^[0-9a-fA-F-]{36}$'
  AND public.storage_user_in_my_org(((storage.foldername(name))[2])::uuid));
-- INSERT/UPDATE/DELETE: only your own profile media (path folder = your user id). The
-- equality needs no regex guard (a non-uuid segment simply won't match current_user_id).
CREATE POLICY profile_media_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id='profile-media' AND (storage.foldername(name))[2] = (public.current_user_id())::text);
CREATE POLICY profile_media_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id='profile-media' AND (storage.foldername(name))[2] = (public.current_user_id())::text)
  WITH CHECK (bucket_id='profile-media' AND (storage.foldername(name))[2] = (public.current_user_id())::text);
CREATE POLICY profile_media_delete ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id='profile-media' AND (storage.foldername(name))[2] = (public.current_user_id())::text);

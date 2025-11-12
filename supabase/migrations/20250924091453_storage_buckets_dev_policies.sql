-- Create storage buckets if missing and set dev RLS policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'profile-media') THEN
    PERFORM storage.create_bucket('profile-media', public := true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'audit-photos') THEN
    PERFORM storage.create_bucket('audit-photos', public := true);
  END IF;
END $$;

-- Dev policies for storage.objects to allow public read and anon/auth uploads and deletes
DO $$ BEGIN
  -- profile-media
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='dev_select_profile_media') THEN
    CREATE POLICY "dev_select_profile_media" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'profile-media');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='dev_insert_profile_media') THEN
    CREATE POLICY "dev_insert_profile_media" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'profile-media');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='dev_delete_profile_media') THEN
    CREATE POLICY "dev_delete_profile_media" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'profile-media');
  END IF;

  -- audit-photos
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='dev_select_audit_photos') THEN
    CREATE POLICY "dev_select_audit_photos" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'audit-photos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='dev_insert_audit_photos') THEN
    CREATE POLICY "dev_insert_audit_photos" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'audit-photos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='dev_delete_audit_photos') THEN
    CREATE POLICY "dev_delete_audit_photos" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'audit-photos');
  END IF;
END $$;;

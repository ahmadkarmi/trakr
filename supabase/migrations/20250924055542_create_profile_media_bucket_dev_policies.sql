insert into storage.buckets (id, name, public)
values ('profile-media', 'profile-media', true)
on conflict (id) do nothing;

-- Dev-permissive RLS for profile-media bucket
-- Allow both anon and authenticated roles to read/write in dev
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'dev_profile_media_select'
  ) THEN
    CREATE POLICY "dev_profile_media_select" ON storage.objects
      FOR SELECT TO anon, authenticated
      USING (bucket_id = 'profile-media');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'dev_profile_media_insert'
  ) THEN
    CREATE POLICY "dev_profile_media_insert" ON storage.objects
      FOR INSERT TO anon, authenticated
      WITH CHECK (bucket_id = 'profile-media');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'dev_profile_media_update'
  ) THEN
    CREATE POLICY "dev_profile_media_update" ON storage.objects
      FOR UPDATE TO anon, authenticated
      USING (bucket_id = 'profile-media')
      WITH CHECK (bucket_id = 'profile-media');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'dev_profile_media_delete'
  ) THEN
    CREATE POLICY "dev_profile_media_delete" ON storage.objects
      FOR DELETE TO anon, authenticated
      USING (bucket_id = 'profile-media');
  END IF;
END $$;;

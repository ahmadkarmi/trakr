-- Create audit-photos storage bucket (public)
insert into storage.buckets (id, name, public)
values ('audit-photos', 'audit-photos', true)
on conflict (id) do nothing;

-- Dev-permissive Storage RLS for audit-photos bucket
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'dev_audit_photos_select'
  ) THEN
    CREATE POLICY "dev_audit_photos_select" ON storage.objects
      FOR SELECT TO anon, authenticated
      USING (bucket_id = 'audit-photos');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'dev_audit_photos_insert'
  ) THEN
    CREATE POLICY "dev_audit_photos_insert" ON storage.objects
      FOR INSERT TO anon, authenticated
      WITH CHECK (bucket_id = 'audit-photos');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'dev_audit_photos_update'
  ) THEN
    CREATE POLICY "dev_audit_photos_update" ON storage.objects
      FOR UPDATE TO anon, authenticated
      USING (bucket_id = 'audit-photos')
      WITH CHECK (bucket_id = 'audit-photos');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'dev_audit_photos_delete'
  ) THEN
    CREATE POLICY "dev_audit_photos_delete" ON storage.objects
      FOR DELETE TO anon, authenticated
      USING (bucket_id = 'audit-photos');
  END IF;
END $$;

-- Dev-permissive policies for public.audit_photos
ALTER TABLE public.audit_photos ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audit_photos' AND policyname='dev_select_audit_photos'
  ) THEN
    CREATE POLICY "dev_select_audit_photos" ON public.audit_photos FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audit_photos' AND policyname='dev_insert_audit_photos'
  ) THEN
    CREATE POLICY "dev_insert_audit_photos" ON public.audit_photos FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audit_photos' AND policyname='dev_update_audit_photos'
  ) THEN
    CREATE POLICY "dev_update_audit_photos" ON public.audit_photos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audit_photos' AND policyname='dev_delete_audit_photos'
  ) THEN
    CREATE POLICY "dev_delete_audit_photos" ON public.audit_photos FOR DELETE TO anon, authenticated USING (true);
  END IF;
END $$;

-- Dev-permissive write policies for branches
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='branches' AND policyname='dev_insert_branches'
  ) THEN
    CREATE POLICY "dev_insert_branches" ON public.branches FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='branches' AND policyname='dev_update_branches'
  ) THEN
    CREATE POLICY "dev_update_branches" ON public.branches FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='branches' AND policyname='dev_delete_branches'
  ) THEN
    CREATE POLICY "dev_delete_branches" ON public.branches FOR DELETE TO anon, authenticated USING (true);
  END IF;
END $$;

-- Dev-permissive insert policy for audits (createAudit)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audits' AND policyname='dev_insert_audits'
  ) THEN
    CREATE POLICY "dev_insert_audits" ON public.audits FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
END $$;;

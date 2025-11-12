-- Enable dev RLS and permissive policies for core entities
ALTER TABLE IF EXISTS public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auditor_branch_assignments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  -- audits
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audits' AND policyname='dev_select_audits') THEN
    CREATE POLICY "dev_select_audits" ON public.audits FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audits' AND policyname='dev_insert_audits') THEN
    CREATE POLICY "dev_insert_audits" ON public.audits FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audits' AND policyname='dev_update_audits') THEN
    CREATE POLICY "dev_update_audits" ON public.audits FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audits' AND policyname='dev_delete_audits') THEN
    CREATE POLICY "dev_delete_audits" ON public.audits FOR DELETE TO anon, authenticated USING (true);
  END IF;
  -- audit_photos
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audit_photos' AND policyname='dev_select_audit_photos') THEN
    CREATE POLICY "dev_select_audit_photos" ON public.audit_photos FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audit_photos' AND policyname='dev_insert_audit_photos') THEN
    CREATE POLICY "dev_insert_audit_photos" ON public.audit_photos FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audit_photos' AND policyname='dev_delete_audit_photos') THEN
    CREATE POLICY "dev_delete_audit_photos" ON public.audit_photos FOR DELETE TO anon, authenticated USING (true);
  END IF;
  -- auditor_branch_assignments
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='auditor_branch_assignments' AND policyname='dev_select_aba') THEN
    CREATE POLICY "dev_select_aba" ON public.auditor_branch_assignments FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='auditor_branch_assignments' AND policyname='dev_insert_aba') THEN
    CREATE POLICY "dev_insert_aba" ON public.auditor_branch_assignments FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='auditor_branch_assignments' AND policyname='dev_delete_aba') THEN
    CREATE POLICY "dev_delete_aba" ON public.auditor_branch_assignments FOR DELETE TO anon, authenticated USING (true);
  END IF;
END $$;;

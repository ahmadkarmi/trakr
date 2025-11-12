-- Enable and add dev policies for organizations and users
ALTER TABLE IF EXISTS public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  -- organizations
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='organizations' AND policyname='dev_select_organizations') THEN
    CREATE POLICY "dev_select_organizations" ON public.organizations FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='organizations' AND policyname='dev_update_organizations') THEN
    CREATE POLICY "dev_update_organizations" ON public.organizations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='organizations' AND policyname='dev_insert_organizations') THEN
    CREATE POLICY "dev_insert_organizations" ON public.organizations FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='organizations' AND policyname='dev_delete_organizations') THEN
    CREATE POLICY "dev_delete_organizations" ON public.organizations FOR DELETE TO anon, authenticated USING (true);
  END IF;
  -- users
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='dev_select_users') THEN
    CREATE POLICY "dev_select_users" ON public.users FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='dev_update_users') THEN
    CREATE POLICY "dev_update_users" ON public.users FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='dev_insert_users') THEN
    CREATE POLICY "dev_insert_users" ON public.users FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='dev_delete_users') THEN
    CREATE POLICY "dev_delete_users" ON public.users FOR DELETE TO anon, authenticated USING (true);
  END IF;
END $$;;

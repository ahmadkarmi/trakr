-- Enable and add dev RLS for branches and activity_logs
ALTER TABLE IF EXISTS public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.activity_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  -- branches
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='branches' AND policyname='dev_select_branches') THEN
    CREATE POLICY "dev_select_branches" ON public.branches FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='branches' AND policyname='dev_insert_branches') THEN
    CREATE POLICY "dev_insert_branches" ON public.branches FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='branches' AND policyname='dev_update_branches') THEN
    CREATE POLICY "dev_update_branches" ON public.branches FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='branches' AND policyname='dev_delete_branches') THEN
    CREATE POLICY "dev_delete_branches" ON public.branches FOR DELETE TO anon, authenticated USING (true);
  END IF;
  -- activity_logs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='activity_logs' AND policyname='dev_select_activity_logs') THEN
    CREATE POLICY "dev_select_activity_logs" ON public.activity_logs FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='activity_logs' AND policyname='dev_insert_activity_logs') THEN
    CREATE POLICY "dev_insert_activity_logs" ON public.activity_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
END $$;;

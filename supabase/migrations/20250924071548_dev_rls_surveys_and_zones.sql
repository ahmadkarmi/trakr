-- Enable and add dev policies for survey-related tables
ALTER TABLE IF EXISTS public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.survey_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.survey_questions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  -- surveys
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='surveys' AND policyname='dev_select_surveys') THEN
    CREATE POLICY "dev_select_surveys" ON public.surveys FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='surveys' AND policyname='dev_insert_surveys') THEN
    CREATE POLICY "dev_insert_surveys" ON public.surveys FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='surveys' AND policyname='dev_update_surveys') THEN
    CREATE POLICY "dev_update_surveys" ON public.surveys FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='surveys' AND policyname='dev_delete_surveys') THEN
    CREATE POLICY "dev_delete_surveys" ON public.surveys FOR DELETE TO anon, authenticated USING (true);
  END IF;
  -- survey_sections
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='survey_sections' AND policyname='dev_select_survey_sections') THEN
    CREATE POLICY "dev_select_survey_sections" ON public.survey_sections FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='survey_sections' AND policyname='dev_insert_survey_sections') THEN
    CREATE POLICY "dev_insert_survey_sections" ON public.survey_sections FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='survey_sections' AND policyname='dev_update_survey_sections') THEN
    CREATE POLICY "dev_update_survey_sections" ON public.survey_sections FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='survey_sections' AND policyname='dev_delete_survey_sections') THEN
    CREATE POLICY "dev_delete_survey_sections" ON public.survey_sections FOR DELETE TO anon, authenticated USING (true);
  END IF;
  -- survey_questions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='survey_questions' AND policyname='dev_select_survey_questions') THEN
    CREATE POLICY "dev_select_survey_questions" ON public.survey_questions FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='survey_questions' AND policyname='dev_insert_survey_questions') THEN
    CREATE POLICY "dev_insert_survey_questions" ON public.survey_questions FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='survey_questions' AND policyname='dev_update_survey_questions') THEN
    CREATE POLICY "dev_update_survey_questions" ON public.survey_questions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='survey_questions' AND policyname='dev_delete_survey_questions') THEN
    CREATE POLICY "dev_delete_survey_questions" ON public.survey_questions FOR DELETE TO anon, authenticated USING (true);
  END IF;
END $$;

-- Enable and add dev policies for zones and links
ALTER TABLE IF EXISTS public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.zone_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.zone_assignments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  -- zones
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='zones' AND policyname='dev_select_zones') THEN
    CREATE POLICY "dev_select_zones" ON public.zones FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='zones' AND policyname='dev_insert_zones') THEN
    CREATE POLICY "dev_insert_zones" ON public.zones FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='zones' AND policyname='dev_update_zones') THEN
    CREATE POLICY "dev_update_zones" ON public.zones FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='zones' AND policyname='dev_delete_zones') THEN
    CREATE POLICY "dev_delete_zones" ON public.zones FOR DELETE TO anon, authenticated USING (true);
  END IF;
  -- zone_branches
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='zone_branches' AND policyname='dev_select_zone_branches') THEN
    CREATE POLICY "dev_select_zone_branches" ON public.zone_branches FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='zone_branches' AND policyname='dev_insert_zone_branches') THEN
    CREATE POLICY "dev_insert_zone_branches" ON public.zone_branches FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='zone_branches' AND policyname='dev_delete_zone_branches') THEN
    CREATE POLICY "dev_delete_zone_branches" ON public.zone_branches FOR DELETE TO anon, authenticated USING (true);
  END IF;
  -- zone_assignments
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='zone_assignments' AND policyname='dev_select_zone_assignments') THEN
    CREATE POLICY "dev_select_zone_assignments" ON public.zone_assignments FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='zone_assignments' AND policyname='dev_insert_zone_assignments') THEN
    CREATE POLICY "dev_insert_zone_assignments" ON public.zone_assignments FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='zone_assignments' AND policyname='dev_delete_zone_assignments') THEN
    CREATE POLICY "dev_delete_zone_assignments" ON public.zone_assignments FOR DELETE TO anon, authenticated USING (true);
  END IF;
END $$;;

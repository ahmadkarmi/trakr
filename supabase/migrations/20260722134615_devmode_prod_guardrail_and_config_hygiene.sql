-- Phase 5: dev_mode production guardrail + config hygiene (defense-in-depth).
-- dev_mode is currently latent (no live policy references is_dev_mode()), but if a
-- future policy re-introduces `is_dev_mode() OR ...`, it must not be able to disable
-- RLS on the production database. Make production authoritative.

-- 1. Harden is_dev_mode(): never true when app_config.environment='production',
--    regardless of the dev_mode flag.
CREATE OR REPLACE FUNCTION public.is_dev_mode()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  select
    not exists (select 1 from public.app_config where key='environment' and value='production')
    and exists (select 1 from public.app_config where key='dev_mode' and value in ('true','1','on','t','yes'))
$$;

-- 2. Mark this database as production (only a prod migration sets this).
INSERT INTO public.app_config(key, value) VALUES ('environment', 'production')
  ON CONFLICT (key) DO UPDATE SET value = excluded.value;

-- 3. is_dev_mode() has no client caller and must not be anon-callable. (Supabase
--    default privileges grant anon EXECUTE explicitly, so revoke both.)
REVOKE EXECUTE ON FUNCTION public.is_dev_mode() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_dev_mode() TO authenticated;

-- 4. app_config holds global switches (dev_mode, environment). Restrict direct
--    writes to super admins; org-scoped keys are written via the SECURITY DEFINER
--    set_org_config RPC (already super-admin-gated), which bypasses these policies.
ALTER POLICY app_config_admin_insert ON public.app_config WITH CHECK (public.is_super_admin());
ALTER POLICY app_config_admin_update ON public.app_config USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
ALTER POLICY app_config_admin_delete ON public.app_config USING (public.is_super_admin());

-- 5. data_access_audit: a direct client insert must be for the caller's own org
--    (defense-in-depth; the sanctioned writer is the definer RPC below).
ALTER POLICY data_access_audit_insert ON public.data_access_audit
  WITH CHECK ((select auth.uid()) = user_id AND org_id = public.current_user_org_id());

-- 6. log_data_access: don't trust a caller-supplied org_id. A non-super caller can
--    only log their own org; only a super admin may target another org.
CREATE OR REPLACE FUNCTION public.log_data_access(p_org_id uuid, p_action text, p_reason text, p_export_scope jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare
  v_user_id uuid;
  v_org uuid := case when public.is_super_admin()
                     then coalesce(p_org_id, public.current_user_org_id())
                     else public.current_user_org_id() end;
begin
  select u.id into v_user_id
  from public.users u
  where u.auth_user_id = auth.uid() or u.id = auth.uid()
  order by (u.auth_user_id = auth.uid()) desc
  limit 1;

  insert into public.data_access_audit (org_id, user_id, action, reason, export_scope)
  values (
    v_org,
    v_user_id,
    coalesce(nullif(p_action, ''), 'org_export'),
    p_reason,
    coalesce(p_export_scope, '{}'::jsonb)
  );
end;
$function$;

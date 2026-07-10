-- log_data_access wrote data_access_audit.user_id = auth.uid() directly, but
-- seeder-created users have public.users.id != auth.uid() (linked via
-- auth_user_id), so the FK to users(id) failed and every caller - notably
-- set_org_config, i.e. the Settings > Super Admin org toggles - errored with
-- 409 for those users. Resolve the app user id with the same tolerant lookup
-- used by set_audit_approval (auth_user_id match preferred, id match covers
-- auto-provisioned users where both are equal). user_id is nullable: if no
-- app user exists (service contexts), keep the audit event with NULL rather
-- than failing the business operation.
CREATE OR REPLACE FUNCTION public.log_data_access(p_org_id uuid, p_action text, p_reason text, p_export_scope jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
begin
  select u.id into v_user_id
  from public.users u
  where u.auth_user_id = auth.uid() or u.id = auth.uid()
  order by (u.auth_user_id = auth.uid()) desc
  limit 1;

  insert into public.data_access_audit (org_id, user_id, action, reason, export_scope)
  values (
    coalesce(p_org_id, public.current_user_org_id()),
    v_user_id,
    coalesce(nullif(p_action, ''), 'org_export'),
    p_reason,
    coalesce(p_export_scope, '{}'::jsonb)
  );
end;
$function$

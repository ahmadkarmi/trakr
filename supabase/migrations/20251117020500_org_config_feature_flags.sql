-- Org configuration helpers and feature flags

create or replace function public.get_org_config(p_org_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'devMode', coalesce((select value from public.app_config where key = format('org:%s:dev_mode', p_org_id)), 'false')::boolean,
    'exportsEnabled', coalesce((select value from public.app_config where key = format('org:%s:exports_enabled', p_org_id)), 'false')::boolean,
    'featureFlags', coalesce((select value from public.app_config where key = format('org:%s:feature_flags', p_org_id)), '[]')::jsonb
  )
$$;

create or replace function public.set_org_config(
  p_org_id uuid,
  p_payload jsonb,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dev boolean;
  v_exports boolean;
  v_flags jsonb;
begin
  if not public.is_super_admin() then
    raise exception 'Only super admins can modify org configuration';
  end if;

  if p_payload ? 'devMode' then
    v_dev := (p_payload->>'devMode')::boolean;
    insert into public.app_config(key, value)
    values (format('org:%s:dev_mode', p_org_id), case when v_dev then 'true' else 'false' end)
    on conflict (key) do update set value = excluded.value;
  end if;

  if p_payload ? 'exportsEnabled' then
    v_exports := (p_payload->>'exportsEnabled')::boolean;
    insert into public.app_config(key, value)
    values (format('org:%s:exports_enabled', p_org_id), case when v_exports then 'true' else 'false' end)
    on conflict (key) do update set value = excluded.value;
  end if;

  if p_payload ? 'featureFlags' then
    v_flags := coalesce(p_payload->'featureFlags', '[]'::jsonb);
    insert into public.app_config(key, value)
    values (format('org:%s:feature_flags', p_org_id), v_flags::text)
    on conflict (key) do update set value = excluded.value;
  end if;

  perform public.log_data_access(p_org_id, 'org_config_update', p_reason, jsonb_build_object('changes', p_payload));
  return public.get_org_config(p_org_id);
end;
$$;

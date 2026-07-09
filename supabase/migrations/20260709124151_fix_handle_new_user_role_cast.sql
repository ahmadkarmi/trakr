-- handle_new_user()'s COALESCE(NEW.raw_user_meta_data->>'role', 'AUDITOR')
-- returns text, but public.users.role is the user_role enum. Postgres does
-- not implicitly cast a COALESCE expression result to an enum (only bare
-- literals get that treatment), so this INSERT has always failed with
-- "column role is of type user_role but expression is of type text" on any
-- fresh auth.users row - including the real "auto-provision" signUp()
-- fallback in stores/auth.ts and LoginScreen.tsx for first-time logins by
-- seeded users. Add the missing cast.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  INSERT INTO public.users (
    id,
    auth_user_id,
    email,
    full_name,
    role,
    org_id,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(NEW.raw_user_meta_data->>'role', 'AUDITOR')::user_role,
    (NEW.raw_user_meta_data->>'org_id')::UUID,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$

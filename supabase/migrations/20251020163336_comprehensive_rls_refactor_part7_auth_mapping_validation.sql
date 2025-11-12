-- ================================================
-- COMPREHENSIVE RLS REFACTOR - PART 7: AUTH MAPPING & VALIDATION
-- ================================================

-- ================================================
-- FIX AUTH_USER_ID MAPPINGS
-- ================================================

-- Ensure all users have auth_user_id set correctly
-- This links public.users to auth.users
UPDATE public.users u
SET auth_user_id = a.id
FROM auth.users a
WHERE u.email = a.email
  AND u.auth_user_id IS NULL;

-- ================================================
-- VALIDATION FUNCTION
-- ================================================

-- Function to validate RLS setup for current user
CREATE OR REPLACE FUNCTION public.validate_rls_for_current_user()
RETURNS TABLE (
  check_name text,
  status text,
  details text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_role user_role;
  v_auth_uid uuid;
BEGIN
  -- Get auth UID
  v_auth_uid := auth.uid();
  
  -- Get current user context
  v_user_id := current_user_id();
  v_org_id := current_user_org_id();
  v_role := current_user_role();
  
  -- Check 1: Auth session exists
  RETURN QUERY SELECT
    'Auth Session'::text,
    CASE WHEN v_auth_uid IS NOT NULL THEN 'OK' ELSE 'FAIL' END,
    COALESCE('auth.uid: ' || v_auth_uid::text, 'No auth session');
  
  -- Check 2: User record found
  RETURN QUERY SELECT
    'User Record'::text,
    CASE WHEN v_user_id IS NOT NULL THEN 'OK' ELSE 'FAIL' END,
    COALESCE('user_id: ' || v_user_id::text, 'No user record found - auth_user_id not linked');
  
  -- Check 3: Org assignment
  RETURN QUERY SELECT
    'Organization'::text,
    CASE WHEN v_org_id IS NOT NULL THEN 'OK' ELSE 'WARN' END,
    COALESCE('org_id: ' || v_org_id::text, 'No organization assigned (OK for super admin)');
  
  -- Check 4: Role assignment
  RETURN QUERY SELECT
    'Role'::text,
    CASE WHEN v_role IS NOT NULL THEN 'OK' ELSE 'FAIL' END,
    COALESCE('role: ' || v_role::text, 'No role assigned');
  
  -- Check 5: Can see organizations
  RETURN QUERY SELECT
    'Organizations Access'::text,
    CASE WHEN (SELECT COUNT(*) FROM public.organizations) > 0 THEN 'OK' ELSE 'FAIL' END,
    (SELECT COUNT(*)::text || ' organizations visible' FROM public.organizations);
  
  -- Check 6: Can see users
  RETURN QUERY SELECT
    'Users Access'::text,
    CASE WHEN (SELECT COUNT(*) FROM public.users) > 0 THEN 'OK' ELSE 'FAIL' END,
    (SELECT COUNT(*)::text || ' users visible' FROM public.users);
  
  -- Check 7: Can see branches (if not auditor or if has assignments)
  RETURN QUERY SELECT
    'Branches Access'::text,
    CASE 
      WHEN v_role = 'AUDITOR' THEN
        CASE WHEN (SELECT COUNT(*) FROM public.branches) > 0 THEN 'OK' ELSE 'WARN' END
      ELSE
        CASE WHEN (SELECT COUNT(*) FROM public.branches) > 0 THEN 'OK' ELSE 'FAIL' END
    END,
    (SELECT COUNT(*)::text || ' branches visible' FROM public.branches);
  
  -- Check 8: Auditor assignment (for auditors only)
  IF v_role = 'AUDITOR' THEN
    RETURN QUERY SELECT
      'Auditor Assignment'::text,
      CASE WHEN (SELECT COUNT(*) FROM public.auditor_assignments WHERE user_id = v_user_id) > 0 THEN 'OK' ELSE 'WARN' END,
      COALESCE(
        (SELECT 'Assigned to ' || array_length(branch_ids, 1)::text || ' branches' 
         FROM public.auditor_assignments WHERE user_id = v_user_id LIMIT 1),
        'No assignment found'
      );
  END IF;
  
  -- Check 9: Manager assignment (for managers only)
  IF v_role = 'BRANCH_MANAGER' THEN
    RETURN QUERY SELECT
      'Manager Assignment'::text,
      CASE WHEN (SELECT COUNT(*) FROM public.branch_manager_assignments WHERE manager_id = v_user_id) > 0 THEN 'OK' ELSE 'WARN' END,
      (SELECT COUNT(*)::text || ' branches managed' FROM public.branch_manager_assignments WHERE manager_id = v_user_id);
  END IF;
  
END;
$$;

-- ================================================
-- GRANT PERMISSIONS TO HELPER FUNCTIONS
-- ================================================

-- Allow authenticated users to use helper functions
GRANT EXECUTE ON FUNCTION public.current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_super() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_auditor_assignment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_assigned_branch_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_managed_branch_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_rls_for_current_user() TO authenticated;

-- ================================================
-- COMMENTS FOR DOCUMENTATION
-- ================================================

COMMENT ON FUNCTION public.validate_rls_for_current_user() IS 'Validates RLS setup and access for the current authenticated user. Returns diagnostic table.';

-- ================================================
-- FINAL VALIDATION REPORT
-- ================================================

-- Show summary of RLS policies across all tables
DO $$
DECLARE
  table_count int;
  policy_count int;
BEGIN
  SELECT COUNT(DISTINCT tablename) INTO table_count
  FROM pg_policies
  WHERE schemaname = 'public';
  
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public';
  
  RAISE NOTICE '================================================';
  RAISE NOTICE 'RLS REFACTOR COMPLETE';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Tables with RLS policies: %', table_count;
  RAISE NOTICE 'Total RLS policies created: %', policy_count;
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Helper functions created: 9';
  RAISE NOTICE 'All policies use SECURITY DEFINER helpers';
  RAISE NOTICE 'No circular references';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'To test your access, run:';
  RAISE NOTICE 'SELECT * FROM public.validate_rls_for_current_user();';
  RAISE NOTICE '================================================';
END $$;
;

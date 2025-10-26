# Fix Production Login Issue

## Problem
Authentication fails with error: "User profile not found in database" even though the user exists in both Supabase Auth and the `public.users` table.

## Root Cause
The `auth_user_id` column in `public.users` table doesn't match the Supabase Auth user's `id`. This breaks the mapping between:
- **Supabase Auth** (`auth.users.id`) ← Authentication layer
- **Application DB** (`public.users.auth_user_id`) ← Application profile

## Solutions

### Solution 1: Quick Fix via Supabase Dashboard (RECOMMENDED)

1. **Go to Supabase SQL Editor**
   - Open your Supabase project dashboard
   - Navigate to: SQL Editor → New query

2. **Check Current State**
   ```sql
   -- See the mismatch
   SELECT 
     u.id as app_user_id,
     u.email,
     u.auth_user_id as current_auth_id,
     a.id as correct_auth_id,
     CASE 
       WHEN u.auth_user_id = a.id THEN '✅ CORRECT'
       WHEN u.auth_user_id IS NULL THEN '❌ NULL'
       ELSE '❌ MISMATCH'
     END as status
   FROM public.users u
   LEFT JOIN auth.users a ON a.email = u.email
   WHERE u.email = 'admin@trakr.com';
   ```

3. **Fix the Mapping**
   ```sql
   -- Update auth_user_id to match auth.users.id
   UPDATE public.users u
   SET auth_user_id = a.id,
       updated_at = now()
   FROM auth.users a
   WHERE a.email = u.email
     AND (u.auth_user_id IS NULL OR u.auth_user_id != a.id);
   ```

4. **Verify the Fix**
   ```sql
   -- All should show ✅ CORRECT
   SELECT 
     u.email,
     u.auth_user_id = a.id as is_mapped_correctly
   FROM public.users u
   JOIN auth.users a ON a.email = u.email;
   ```

5. **Test Login**
   - Try logging in at: https://trakr-mobile.vercel.app/login
   - Should now work! ✅

### Solution 2: Apply Migration (For Permanent Fix)

1. **Using Supabase CLI**
   ```bash
   # Navigate to project root
   cd d:\Dev\Apps\Trakr
   
   # Apply migration
   supabase db push --db-url "your-production-db-url"
   ```

2. **Or Apply via Dashboard**
   - Copy contents of `supabase/migrations/20251026_fix_auth_user_id_mapping.sql`
   - Paste into SQL Editor → Run

### Solution 3: Prevent Future Issues

The code fix has already been applied to `apps/web/src/utils/supabaseApi.ts`:
- `getUserById()` now checks both `id` AND `auth_user_id` columns
- This provides a fallback if mapping is missing
- Deploy this fix to production

## Common Scenarios

### Scenario A: User Exists in Auth but Not in public.users
**Symptoms**: "User profile not found" error
**Fix**: Create user record in `public.users`:
```sql
INSERT INTO public.users (id, auth_user_id, email, full_name, role, org_id)
VALUES (
  gen_random_uuid(),
  'YOUR-AUTH-USER-ID',
  'admin@trakr.com',
  'Admin User',
  'ADMIN',
  'YOUR-ORG-ID'
);
```

### Scenario B: User Exists in public.users but Not in Auth
**Symptoms**: "Invalid login credentials" error
**Fix**: 
1. Reset password via Supabase Dashboard (Authentication → Users → Reset Password)
2. Or create auth user via API/Dashboard

### Scenario C: Both Exist but auth_user_id is Wrong
**Symptoms**: "User profile not found" error (this is your case!)
**Fix**: Use Solution 1 above ✅

## Verification Checklist

After applying fixes:
- [ ] Run check query - all users show ✅ CORRECT
- [ ] Test login with admin@trakr.com
- [ ] Test login with other user accounts
- [ ] Check that role-based quick login buttons work
- [ ] Verify dashboard loads correctly after login

## Prevention for New Users

When creating new users, always ensure:
1. Create user in Supabase Auth first
2. Then create profile in `public.users` with correct `auth_user_id`

Example:
```typescript
// 1. Create auth user
const { data: authData } = await supabase.auth.admin.createUser({
  email: 'newuser@example.com',
  password: 'SecurePassword123!',
  email_confirm: true
})

// 2. Create profile with correct mapping
await supabase.from('users').insert({
  id: generateUUID(),
  auth_user_id: authData.user.id, // ← CRITICAL!
  email: 'newuser@example.com',
  full_name: 'New User',
  role: 'AUDITOR',
  org_id: 'your-org-id'
})
```

## Still Having Issues?

1. **Check RLS Policies**: Ensure RLS policies allow SELECT on `public.users`
2. **Check Auth Session**: Verify session is being created in Supabase Auth
3. **Check Browser Console**: Look for specific error messages
4. **Check Supabase Logs**: Navigate to Logs → Auth to see authentication attempts

## Related Files
- Code fix: `apps/web/src/utils/supabaseApi.ts` (line 323-333)
- Migration: `supabase/migrations/20251026_fix_auth_user_id_mapping.sql`
- Auth logic: `apps/web/src/stores/auth.ts` (line 153, 237)

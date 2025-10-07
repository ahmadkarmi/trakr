# Row-Level Security (RLS) Verification Guide

**Date:** 2025-10-06  
**Purpose:** Verify all RLS policies are correctly configured in Supabase

---

## **How to Verify RLS Policies**

1. Open Supabase Dashboard
2. Go to **Table Editor** → Select table
3. Click **Policies** tab
4. Verify policies match requirements below

---

## **Critical Tables & Required RLS Policies**

### **✅ 1. auditor_assignments**

**Policies Required:**
```sql
-- READ: All authenticated users can view
"Authenticated users can view auditor assignments" (SELECT)
  USING: true

-- WRITE: Admins and assigned user can manage
"Admins can manage auditor assignments" (ALL)
  USING: auth.uid() = user_id OR user is ADMIN/SUPER_ADMIN
  WITH CHECK: Same as USING
```

**Verify Commands:**
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'auditor_assignments';
-- Should show: rowsecurity = true

-- Check existing policies
SELECT * FROM pg_policies 
WHERE tablename = 'auditor_assignments';
```

---

### **✅ 2. branch_manager_assignments**

**Policies Required:**
```sql
-- READ: All authenticated users can view (for notifications)
"Authenticated users can view branch manager assignments" (SELECT)
  USING: true

-- WRITE: Only admins can modify
"Admins can manage branch manager assignments" (ALL)
  USING: user is ADMIN/SUPER_ADMIN
  WITH CHECK: Same as USING
```

**Verify Commands:**
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'branch_manager_assignments';
```

---

### **✅ 3. organizations**

**Policies Required:**
```sql
-- READ: All authenticated users in org can view
"Users can view their organization" (SELECT)
  USING: auth.uid() in organization

-- WRITE: Only admins can modify
"Admins can update organization" (UPDATE)
  USING: user is ADMIN/SUPER_ADMIN
  WITH CHECK: Same as USING
```

**Verify Commands:**
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'organizations';
```

---

### **✅ 4. branches**

**Policies Required:**
```sql
-- READ: All authenticated users in org can view
"Users can view branches in their organization" (SELECT)
  USING: branch.org_id = user.org_id

-- WRITE: Only admins can modify
"Admins can manage branches" (INSERT, UPDATE, DELETE)
  USING: user is ADMIN/SUPER_ADMIN
  WITH CHECK: Same as USING
```

**Verify Commands:**
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'branches';
```

---

### **✅ 5. zones**

**Policies Required:**
```sql
-- READ: All authenticated users in org can view
"Users can view zones in their organization" (SELECT)
  USING: zone.org_id = user.org_id

-- WRITE: Only admins can modify
"Admins can manage zones" (INSERT, UPDATE, DELETE)
  USING: user is ADMIN/SUPER_ADMIN
  WITH CHECK: Same as USING
```

**Verify Commands:**
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'zones';
```

---

### **✅ 6. surveys**

**Policies Required:**
```sql
-- READ: All authenticated users can view active surveys
"Users can view active surveys" (SELECT)
  USING: is_active = true OR user is ADMIN/SUPER_ADMIN

-- WRITE: Only admins can modify
"Admins can manage surveys" (INSERT, UPDATE, DELETE)
  USING: user is ADMIN/SUPER_ADMIN
  WITH CHECK: Same as USING
```

**Verify Commands:**
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'surveys';
```

---

### **✅ 7. audits**

**Policies Required:**
```sql
-- READ: Users can view audits they're involved with
"Users can view their audits" (SELECT)
  USING: 
    assigned_to = auth.uid() OR -- Auditor
    auth.uid() IN (SELECT manager_id FROM branch_manager_assignments WHERE branch_id = audits.branch_id) OR -- Manager
    user is ADMIN/SUPER_ADMIN

-- WRITE: Auditors can create/update their audits
"Auditors can manage their audits" (INSERT, UPDATE)
  USING: assigned_to = auth.uid()
  WITH CHECK: assigned_to = auth.uid()

-- DELETE: Only admins
"Admins can delete audits" (DELETE)
  USING: user is ADMIN/SUPER_ADMIN
```

**Verify Commands:**
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'audits';
```

---

### **✅ 8. notifications**

**Policies Required:**
```sql
-- READ: Users can view their own notifications
"Users can view own notifications" (SELECT)
  USING: user_id = auth.uid()

-- WRITE: Users can update their own notifications (mark as read)
"Users can update own notifications" (UPDATE)
  USING: user_id = auth.uid()
  WITH CHECK: user_id = auth.uid()

-- INSERT: System can create notifications (service role)
-- DELETE: Users can delete their own notifications
"Users can delete own notifications" (DELETE)
  USING: user_id = auth.uid()
```

**Verify Commands:**
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'notifications';
```

---

### **✅ 9. users (auth.users metadata)**

**Note:** This uses Supabase Auth, not a custom table.

**Required Setup:**
- User role stored in `raw_user_meta_data->>'role'`
- Organization ID in `raw_user_meta_data->>'orgId'`

**Verify:**
```sql
-- Check auth.users has metadata
SELECT id, email, raw_user_meta_data
FROM auth.users
LIMIT 5;

-- Verify role extraction works
SELECT 
  id, 
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'orgId' as org_id
FROM auth.users;
```

---

## **Quick Verification Script**

Run this in Supabase SQL Editor:

```sql
-- Check all tables have RLS enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'organizations',
    'branches',
    'zones',
    'surveys',
    'audits',
    'auditor_assignments',
    'branch_manager_assignments',
    'notifications'
  )
ORDER BY tablename;

-- Count policies per table
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Show all policies
SELECT 
  tablename,
  policyname,
  cmd, -- Command: SELECT, INSERT, UPDATE, DELETE, ALL
  permissive, -- Usually 'PERMISSIVE'
  roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## **Expected Results**

| Table | RLS Enabled | Min Policies |
|-------|-------------|--------------|
| auditor_assignments | ✅ | 2 |
| branch_manager_assignments | ✅ | 2 |
| organizations | ✅ | 2 |
| branches | ✅ | 2 |
| zones | ✅ | 2 |
| surveys | ✅ | 2 |
| audits | ✅ | 3 |
| notifications | ✅ | 3 |

---

## **Common Issues & Fixes**

### **Issue 1: 403 Forbidden Errors**
**Symptom:** Users cannot read/write data  
**Cause:** RLS enabled but policies too restrictive  
**Fix:** Run the migration: `20250104000004_fix_all_rls_policies.sql`

### **Issue 2: Users See All Data**
**Symptom:** Users can access other organizations' data  
**Cause:** RLS not enabled or policies too permissive  
**Fix:** 
```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### **Issue 3: Admins Cannot Manage Data**
**Symptom:** Admin role doesn't work  
**Cause:** Role not properly checked in policies  
**Fix:** Verify user metadata contains correct role:
```sql
SELECT raw_user_meta_data->>'role' FROM auth.users WHERE email = 'admin@example.com';
```

---

## **Testing RLS Policies**

### **Test as Auditor:**
```sql
-- Set session to auditor user
SELECT set_config('request.jwt.claims', '{"sub":"auditor-user-id","role":"authenticated"}', true);

-- Try to view all audits (should only see assigned)
SELECT * FROM audits;

-- Try to view all branches (should see all in org)
SELECT * FROM branches;

-- Try to modify organization (should fail)
UPDATE organizations SET name = 'Test' WHERE id = 'org-1';
```

### **Test as Admin:**
```sql
-- Set session to admin user
SELECT set_config('request.jwt.claims', '{"sub":"admin-user-id","role":"authenticated"}', true);

-- Try to view all audits (should see all)
SELECT * FROM audits;

-- Try to modify organization (should succeed)
UPDATE organizations SET name = 'Test Org' WHERE id = 'org-1';
```

---

## **Next Steps**

1. ✅ Run verification script in Supabase SQL Editor
2. ✅ Check all tables have RLS enabled
3. ✅ Verify policy counts match expected
4. ✅ Test with different user roles
5. ✅ Apply missing migrations if needed

---

## **Migration Files to Apply**

If RLS policies are missing or incorrect, apply these migrations in order:

1. `supabase/migrations/20250104000004_fix_all_rls_policies.sql`
2. `supabase/migrations/20250104000003_fix_branch_manager_assignments_rls.sql`
3. `supabase/migrations/20250104000001_fix_notification_permissions.sql`

**Command:**
```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase Dashboard → SQL Editor
# Copy/paste each migration file
```

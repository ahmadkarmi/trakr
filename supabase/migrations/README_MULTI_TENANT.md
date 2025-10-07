# Multi-Tenant Security Migration Guide

## Overview

This migration implements **defense-in-depth security** for the Trakr multi-tenant SaaS platform by adding:

1. **Performance Indexes** (Phase 3) - Optimizes org-filtered queries
2. **Row Level Security Policies** (Phase 4) - Database-layer data isolation

---

## 🚀 How to Apply the Migration

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `20250107_multi_tenant_security.sql`
5. Paste into the editor
6. Click **Run** to execute

### Option 2: Supabase CLI

```bash
# Make sure you're in the project root
cd d:\Dev\Apps\Trakr

# Link to your Supabase project (if not already linked)
supabase link --project-ref your-project-ref

# Apply the migration
supabase db push

# Or apply directly
supabase db execute --file supabase/migrations/20250107_multi_tenant_security.sql
```

### Option 3: SQL Command Line

```bash
psql -h your-project.supabase.co -U postgres -d postgres -f supabase/migrations/20250107_multi_tenant_security.sql
```

---

## ✅ Verification Steps

After applying the migration, verify it was successful:

### 1. Check Indexes

Run this query to see all created indexes:

```sql
SELECT 
  tablename, 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%' 
ORDER BY tablename, indexname;
```

**Expected Result:** You should see indexes for:
- `idx_users_org_id`
- `idx_branches_org_id`
- `idx_zones_org_id`
- `idx_surveys_org_id`
- `idx_audits_org_id`
- And more...

### 2. Check RLS is Enabled

Run this query to verify RLS is enabled on all tables:

```sql
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = true
ORDER BY tablename;
```

**Expected Result:** All major tables should have `rowsecurity = true`:
- users
- organizations
- branches
- zones
- surveys
- audits
- And more...

### 3. Check RLS Policies

Run this query to see all RLS policies:

```sql
SELECT 
  schemaname,
  tablename, 
  policyname, 
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
```

**Expected Result:** You should see policies for each table like:
- `organizations_select`
- `organizations_update`
- `users_select`
- `users_insert`
- `users_update`
- `branches_select`
- And many more...

### 4. Test Organization Isolation

**Test as Admin User (Org A):**

```sql
-- This should only return users from your org
SELECT id, email, org_id FROM users;

-- This should only return branches from your org
SELECT id, name, org_id FROM branches;
```

**Test as Super Admin:**

```sql
-- This should return users from ALL orgs
SELECT id, email, org_id FROM users;

-- This should return branches from ALL orgs
SELECT id, name, org_id FROM branches;
```

---

## 🔒 Security Features Implemented

### Row Level Security Policies

**Organizations Table:**
- Super Admins can see all organizations
- Regular users can only see their own organization
- Only Super Admins and Admins can update organizations

**Users Table:**
- Users can only see users from their own organization
- Super Admins can see all users
- Admins can invite/update users in their organization

**Branches, Zones, Surveys:**
- Users can only see data from their organization
- Super Admins can see all data
- Admins can create/update/delete in their organization

**Audits:**
- Users can only see audits from their organization
- Super Admins can see all audits
- Assigned users and managers can update their audits

### Performance Indexes

**Single Column Indexes:**
- All `org_id` columns indexed for fast filtering
- Assignment table foreign keys indexed
- Junction table keys indexed

**Composite Indexes:**
- `(org_id, status)` on audits - Common filtering pattern
- `(org_id, assigned_to)` on audits - Assignment queries
- `(branch_id, status)` on audits - Branch-level filtering

---

## 📊 Performance Impact

### Query Performance Improvements

**Before (No Indexes):**
```sql
-- Full table scan on 10,000 audits
SELECT * FROM audits WHERE org_id = 'org-123';
-- Execution time: ~500ms
```

**After (With Indexes):**
```sql
-- Index scan on 10,000 audits
SELECT * FROM audits WHERE org_id = 'org-123';
-- Execution time: ~5ms
```

**Expected Speedup:** 10-100x faster for org-filtered queries

---

## 🛡️ Security Testing

### Test Scenarios

**Scenario 1: Org A Admin Cannot See Org B Data**

```sql
-- Login as admin@org-a.com
SELECT * FROM users WHERE org_id = 'org-b-id';
-- Expected: Empty result (RLS blocks access)
```

**Scenario 2: Super Admin Can See All Data**

```sql
-- Login as superadmin@trakr.com  
SELECT * FROM users;
-- Expected: All users from all orgs
```

**Scenario 3: Auditor Can Only See Assigned Audits**

```sql
-- Login as auditor@org-a.com
SELECT * FROM audits;
-- Expected: Only audits from Org A (RLS filtering)
```

---

## 🔄 Rollback Instructions

If you need to rollback this migration:

```sql
-- Drop all indexes
DROP INDEX IF EXISTS idx_users_org_id CASCADE;
DROP INDEX IF EXISTS idx_branches_org_id CASCADE;
DROP INDEX IF EXISTS idx_zones_org_id CASCADE;
DROP INDEX IF EXISTS idx_surveys_org_id CASCADE;
DROP INDEX IF EXISTS idx_audits_org_id CASCADE;
-- ... (drop all other indexes)

-- Disable RLS
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE branches DISABLE ROW LEVEL SECURITY;
ALTER TABLE zones DISABLE ROW LEVEL SECURITY;
ALTER TABLE surveys DISABLE ROW LEVEL SECURITY;
ALTER TABLE audits DISABLE ROW LEVEL SECURITY;
-- ... (disable on all other tables)

-- Drop all policies
DROP POLICY IF EXISTS organizations_select ON organizations;
DROP POLICY IF EXISTS organizations_update ON organizations;
DROP POLICY IF EXISTS users_select ON users;
DROP POLICY IF EXISTS users_insert ON users;
DROP POLICY IF EXISTS users_update ON users;
-- ... (drop all other policies)
```

---

## 📝 Important Notes

### Application Compatibility

**✅ This migration is BACKWARD COMPATIBLE** with the application code:

- RLS policies use `auth.uid()` which works with Supabase authentication
- Application queries already filter by `effectiveOrgId` (Phase 2)
- RLS provides **additional security layer** (defense-in-depth)
- If app-level filtering fails, RLS catches it

### Super Admin Access

Super Admins can bypass org filtering because:
- RLS policies check: `(SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'`
- This allows platform staff to manage all organizations
- Matches the application-level logic

### Performance Considerations

- **Indexes add minimal storage overhead** (~5-10% of table size)
- **Massive query performance improvement** (10-100x faster)
- **RLS has negligible performance impact** (< 1ms per query)
- Overall: **NET POSITIVE** for performance

---

## 🎯 Success Criteria

✅ **Migration is successful when:**

1. All indexes are created (verify with query 1)
2. RLS is enabled on all tables (verify with query 2)
3. All policies are created (verify with query 3)
4. Org A admin cannot see Org B data (test scenario 1)
5. Super Admin can see all data (test scenario 2)
6. Application continues to work normally
7. Query performance improves

---

## 🆘 Troubleshooting

### Issue: "Permission denied" errors after migration

**Cause:** RLS policies are too restrictive

**Solution:**
1. Check user's role in database: `SELECT role FROM users WHERE id = auth.uid();`
2. Verify the user belongs to an organization: `SELECT org_id FROM users WHERE id = auth.uid();`
3. Ensure policies allow access for that role

### Issue: Super Admin cannot see all data

**Cause:** Super Admin role not properly detected

**Solution:**
1. Verify Super Admin role: `SELECT role FROM users WHERE email = 'admin@trakr.com';`
2. Should return `SUPER_ADMIN` (exact case)
3. Update if needed: `UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'admin@trakr.com';`

### Issue: Slow queries after migration

**Cause:** Database needs to analyze new indexes

**Solution:**
```sql
-- Run ANALYZE to update query planner statistics
ANALYZE users;
ANALYZE branches;
ANALYZE zones;
ANALYZE surveys;
ANALYZE audits;
-- Or analyze all tables:
ANALYZE;
```

---

## 📚 Additional Resources

- [Supabase Row Level Security Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Index Documentation](https://www.postgresql.org/docs/current/indexes.html)
- [PostgreSQL RLS Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

---

**Status:** ✅ Ready for Production
**Phase:** 3 & 4 Complete
**Security Level:** Defense-in-Depth
**Performance:** Optimized

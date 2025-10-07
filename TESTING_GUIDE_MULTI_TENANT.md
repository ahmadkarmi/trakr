# 🧪 Multi-Tenant Security Testing Guide

**Purpose:** Verify that multi-tenant security is working correctly and data is properly isolated between organizations.

---

## 🎯 **Testing Objectives**

1. ✅ Verify users only see their organization's data
2. ✅ Verify Super Admins can switch between organizations
3. ✅ Verify error states work correctly
4. ✅ Verify empty states display properly
5. ✅ Verify performance is acceptable

---

## 🚀 **Quick Start**

### **Prerequisites:**
```bash
# 1. Ensure dev server is running
npm run dev

# 2. Ensure database migration is applied
# Check Supabase dashboard > SQL Editor
# Migration: 20250107_multi_tenant_security_v2.sql

# 3. Have test users for different organizations
# - admin@trakr.com (Org 1)
# - branchmanager@trakr.com (Org 1)
# - auditor@trakr.com (Org 1)
# - (Create users in Org 2 for cross-org testing)
```

---

## 📋 **Test Scenarios**

### **Scenario 1: Auditor Data Isolation**

**Goal:** Verify auditors only see their organization's data

**Steps:**
1. Login as `auditor@trakr.com`
2. Navigate to Dashboard
3. Check the data displayed:
   - ✅ Only audits assigned to this auditor
   - ✅ Only branches from Org 1
   - ✅ Only surveys from Org 1
   - ✅ No data from Org 2

**Expected Results:**
- Dashboard shows "Auditor Dashboard"
- "Start New Audit" shows only Org 1 branches
- Survey dropdown shows only Org 1 surveys
- Recent audits are only from this auditor

**Test Data Verification:**
```sql
-- Run in Supabase SQL Editor
SELECT 
  a.id, 
  a.org_id, 
  b.name as branch_name,
  u.name as auditor_name
FROM audits a
JOIN branches b ON a.branch_id = b.id
JOIN users u ON a.assigned_to = u.id
WHERE a.assigned_to = '[auditor-user-id]';

-- All org_ids should match the auditor's org_id
```

---

### **Scenario 2: Branch Manager Assignment Isolation**

**Goal:** Verify branch managers only see assigned branches

**Steps:**
1. Login as `branchmanager@trakr.com`
2. Navigate to Dashboard
3. Check the data displayed:
   - ✅ Only assigned branches visible
   - ✅ Only audits from assigned branches
   - ✅ No branches from other orgs
   - ✅ No audits from unassigned branches

**Empty State Test:**
1. Create a new branch manager (no assignments)
2. Login as that user
3. Verify empty state displays:
   - Icon: Building office icon
   - Title: "No Branch Assignments"
   - Message: Instructions to contact admin

**Expected Results:**
- Dashboard shows correct branch count
- Branch selector only shows assigned branches
- Audits filtered to managed branches only
- Clear empty state if no assignments

---

### **Scenario 3: Admin Organization Isolation**

**Goal:** Verify admins see only their org's data

**Steps:**
1. Login as `admin@trakr.com` (Org 1)
2. Navigate to Dashboard
3. Check all data is from Org 1:
   - ✅ Users list (only Org 1)
   - ✅ Branches list (only Org 1)
   - ✅ Audits list (only Org 1)
   - ✅ Assignments (only Org 1)

4. Navigate to "Manage Users"
5. Verify only Org 1 users appear

6. Navigate to "Manage Branches"
7. Verify only Org 1 branches appear

8. Navigate to "Manage Assignments"
9. Verify only Org 1 auditors and branches

**Expected Results:**
- All screens show only Org 1 data
- No way to access Org 2 data
- Filters work correctly

---

### **Scenario 4: Super Admin Org Switching**

**Goal:** Verify Super Admin can switch orgs and see correct data

**Prerequisites:**
- Have Super Admin user
- Have data in multiple organizations

**Steps:**
1. Login as Super Admin
2. Navigate to Settings
3. Check organization selector:
   - ✅ Shows all organizations
   - ✅ Shows "Global View" option

4. Select "Organization 1"
5. Navigate to Dashboard
6. Verify data is from Org 1 only

7. Go back to Settings
8. Select "Organization 2"
9. Navigate to Dashboard
10. Verify data switched to Org 2 only

11. Enable "Global View"
12. Verify you can see data from all orgs

**Expected Results:**
- Organization switcher works
- Data updates when switching
- Global view shows all data
- No errors during switching

---

### **Scenario 5: Error State Testing**

**Goal:** Verify error states display correctly

**Steps:**
1. Open Developer Tools > Network Tab
2. Enable "Offline" mode
3. Refresh the page or navigate to a new screen
4. Verify error state displays:
   - ✅ Error icon (red warning triangle)
   - ✅ Error title ("Error Loading Data")
   - ✅ Error message with details
   - ✅ "Try Again" button

5. Disable offline mode
6. Click "Try Again"
7. Verify data loads successfully

**Expected Results:**
- Professional error display
- Clear error message
- Retry functionality works
- No blank screens or crashes

---

### **Scenario 6: Empty State Testing**

**Goal:** Verify empty states are user-friendly

**Steps:**

**Test 1: No Branch Assignments (Branch Manager)**
1. Create branch manager with no assignments
2. Login as that user
3. Verify empty state:
   - ✅ Icon displays
   - ✅ Title: "No Branch Assignments"
   - ✅ Helpful message
   - ✅ Professional appearance

**Test 2: No Audits (Auditor)**
1. Create new auditor with no audits
2. Login as that user
3. Check "Recent Audits" section
4. Verify appropriate message

**Expected Results:**
- Empty states are clear and helpful
- Icons are appropriate
- Messages guide user to next action
- No confusing blank spaces

---

### **Scenario 7: Activity Logs Isolation**

**Goal:** Verify activity logs are org-scoped

**Steps:**
1. Login as Admin (Org 1)
2. Navigate to Activity Logs
3. Verify logs shown:
   - ✅ Only actions from Org 1 users
   - ✅ Only actions on Org 1 entities
   - ✅ No logs from Org 2

4. Check user names in logs
5. Verify all are from Org 1

**Expected Results:**
- Activity logs properly filtered
- No cross-org activity visible
- Logs are readable and useful

---

### **Scenario 8: Assignments Screen Isolation**

**Goal:** Verify assignment board is org-scoped

**Steps:**
1. Login as Admin (Org 1)
2. Navigate to "Manage Assignments"
3. Verify data shown:
   - ✅ Only Org 1 auditors
   - ✅ Only Org 1 branches
   - ✅ Only Org 1 zones
   - ✅ Assignments are for Org 1 only

4. Try assigning auditor to branch
5. Verify dropdown only shows Org 1 entities

**Expected Results:**
- Assignment board fully isolated
- No cross-org entities visible
- Assignments work correctly

---

### **Scenario 9: Search & Filters**

**Goal:** Verify search only returns org-scoped results

**Steps:**
1. Login as any user
2. Use global search (if available)
3. Search for:
   - Branch names
   - User names
   - Audit IDs

4. Verify results:
   - ✅ Only from current org
   - ✅ No results from other orgs

**Expected Results:**
- Search respects org boundaries
- Filters work correctly
- Results are relevant

---

### **Scenario 10: Performance Testing**

**Goal:** Verify queries are fast with indexes

**Steps:**
1. Open Developer Tools > Network Tab
2. Clear browser cache
3. Login and navigate to Dashboard
4. Check request times:
   - ✅ API calls < 100ms
   - ✅ Dashboard loads < 2 seconds
   - ✅ No slow queries

5. Navigate to different screens
6. Monitor performance

**Expected Results:**
- Fast page loads
- Responsive UI
- No lag or delays
- Acceptable performance at scale

---

## 🔍 **SQL Verification Queries**

### **Check RLS Policies Are Active:**
```sql
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Expected:** Multiple policies on each table

---

### **Check Indexes Are Created:**
```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND indexname LIKE '%org_id%'
ORDER BY tablename;
```

**Expected:** Indexes on org_id columns

---

### **Check Data Isolation:**
```sql
-- Count records per organization
SELECT 
  'audits' as table_name,
  org_id,
  COUNT(*) as record_count
FROM audits
GROUP BY org_id

UNION ALL

SELECT 
  'branches' as table_name,
  org_id,
  COUNT(*) as record_count
FROM branches
GROUP BY org_id

UNION ALL

SELECT 
  'users' as table_name,
  org_id,
  COUNT(*) as record_count
FROM users
GROUP BY org_id

ORDER BY table_name, org_id;
```

**Expected:** Data distributed across organizations

---

## 🚨 **Security Red Flags**

### **Watch For:**

❌ **CRITICAL: Data Leakage**
- Seeing data from other organizations
- Cross-org entities in dropdowns
- Wrong org_id in network requests

❌ **CRITICAL: Unauthorized Access**
- Accessing other org's data by URL manipulation
- API returning unfiltered data
- Missing org_id in queries

❌ **HIGH: Performance Issues**
- Queries taking > 1 second
- Full table scans (check with EXPLAIN)
- Missing indexes

❌ **MEDIUM: UX Issues**
- Blank screens instead of empty states
- Crashes instead of error states
- No feedback on actions

---

## ✅ **Success Criteria**

### **All Tests Must Pass:**
- [ ] Auditors see only their org's data
- [ ] Branch Managers see only assigned branches
- [ ] Admins see only their org's data
- [ ] Super Admins can switch orgs successfully
- [ ] Error states display correctly
- [ ] Empty states display correctly
- [ ] Activity logs are org-scoped
- [ ] Assignments are org-isolated
- [ ] Search respects org boundaries
- [ ] Performance is acceptable (< 100ms queries)

### **SQL Checks Must Pass:**
- [ ] RLS policies are active
- [ ] Indexes are created
- [ ] Data is properly distributed

### **Security Checks Must Pass:**
- [ ] No cross-org data leakage
- [ ] No unauthorized access
- [ ] All API calls include org filtering

---

## 📊 **Test Report Template**

```markdown
# Multi-Tenant Security Test Report

**Date:** [Date]
**Tester:** [Name]
**Environment:** [Dev/Staging/Production]

## Test Results

### Scenario 1: Auditor Data Isolation
- Status: [ ] PASS [ ] FAIL
- Notes: 

### Scenario 2: Branch Manager Isolation
- Status: [ ] PASS [ ] FAIL
- Notes:

### Scenario 3: Admin Isolation
- Status: [ ] PASS [ ] FAIL
- Notes:

### Scenario 4: Super Admin Switching
- Status: [ ] PASS [ ] FAIL
- Notes:

### Scenario 5: Error States
- Status: [ ] PASS [ ] FAIL
- Notes:

### Scenario 6: Empty States
- Status: [ ] PASS [ ] FAIL
- Notes:

### Scenario 7: Activity Logs
- Status: [ ] PASS [ ] FAIL
- Notes:

### Scenario 8: Assignments
- Status: [ ] PASS [ ] FAIL
- Notes:

### Scenario 9: Search & Filters
- Status: [ ] PASS [ ] FAIL
- Notes:

### Scenario 10: Performance
- Status: [ ] PASS [ ] FAIL
- Notes:

## Issues Found
1. 
2. 
3. 

## Recommendations
1. 
2. 
3. 

## Overall Status
- [ ] APPROVED FOR PRODUCTION
- [ ] NEEDS FIXES
- [ ] BLOCKED
```

---

## 🎓 **Tips for Effective Testing**

1. **Test with Real Data**
   - Use realistic org sizes
   - Test with 100+ records
   - Test edge cases

2. **Test Different Roles**
   - Test as each user role
   - Test role transitions
   - Test permission boundaries

3. **Test Error Scenarios**
   - Network failures
   - API errors
   - Invalid data

4. **Test Performance**
   - Large datasets
   - Multiple concurrent users
   - Slow networks

5. **Document Everything**
   - Screenshot issues
   - Record steps to reproduce
   - Note edge cases

---

## 🆘 **Troubleshooting**

### **Issue: Data from Other Orgs Visible**
**Solution:**
1. Check RLS policies are enabled
2. Verify org_id in network requests
3. Check effectiveOrgId in component
4. Review API method implementation

### **Issue: Empty/Error States Not Showing**
**Solution:**
1. Check component imports
2. Verify error/empty conditions
3. Check component rendering logic
4. Review browser console for errors

### **Issue: Slow Performance**
**Solution:**
1. Check indexes are created
2. Review query execution plans
3. Check network waterfall
4. Verify caching is working

---

## 📞 **Support**

**For issues:**
1. Check this testing guide
2. Review MULTI_TENANT_SECURITY_COMPLETE.md
3. Check migration file for RLS policies
4. Review component implementation

**Remember:** Thorough testing ensures a secure, reliable application!

---

✅ **Happy Testing!** ✅

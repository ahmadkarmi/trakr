# Branch Manager Dashboard Fix Summary

## 🔧 Issues Fixed

### 1. **Missing API Method: `getBranchesForManager`** ✅

**Problem**: The dashboard was calling `getBranchesForManager(managerId)` but this method didn't exist in `supabaseApi.ts`, causing it to fall back to mock (which returned empty).

**Fix**: Implemented in `apps/web/src/utils/supabaseApi.ts`:
```typescript
async getBranchesForManager(managerId: string): Promise<Branch[]> {
  const supabase = await getSupabase()
  // Get all branch assignments for this manager
  const { data: assignments, error: assignmentError } = await supabase
    .from('branch_manager_assignments')
    .select('branch_id')
    .eq('manager_id', managerId)
    .eq('is_active', true)
  
  if (assignmentError) throw assignmentError
  
  if (!assignments || assignments.length === 0) {
    return []
  }
  
  // Get the actual branch objects
  const branchIds = assignments.map((a: {branch_id: string}) => a.branch_id)
  const { data: branches, error: branchError } = await supabase
    .from('branches')
    .select('*')
    .in('id', branchIds)
  
  if (branchError) throw branchError
  return (branches || []).map(mapBranch)
}
```

### 2. **Notification Query Invalidation** ✅

**Problem**: When an auditor submitted an audit, the branch manager's notification wasn't appearing in real-time.

**Fix**: Added notification query invalidation in `apps/web/src/screens/AuditSummary.tsx`:
```typescript
for (const assignment of assignments) {
  await notificationHelpers.notifyAuditSubmitted({
    managerId: assignment.managerId,
    auditId: audit.id,
    branchName: branch.name || 'Unknown Branch',
    auditorName: user.name || user.email,
  })
  // Invalidate notification queries for this manager
  queryClient.invalidateQueries({ queryKey: QK.NOTIFICATIONS(assignment.managerId) })
  queryClient.invalidateQueries({ queryKey: QK.UNREAD_NOTIFICATIONS(assignment.managerId) })
}
```

### 3. **Notification Backfill System** ✅

**File**: `apps/web/src/utils/backfillNotifications.ts`

**Purpose**: Automatically creates notifications for existing SUBMITTED audits that don't have notifications yet.

**Integration**: Runs once per browser session in `NotificationDropdown.tsx`

## 🎯 How It Works Now

### When an Auditor Submits an Audit:

1. **Audit Status Changes** → `SUBMITTED`
2. **Branch Manager Assignments Query** → Finds all managers for that branch
3. **Notification Created** → For each manager via `api.createNotification()`
4. **Database Insert** → Real notification in Supabase `notifications` table
5. **Query Invalidation** → Branch manager's notification queries refresh
6. **Real-time Update** → Notification bell shows badge, dashboard updates

### Branch Manager Dashboard Stats:

```typescript
// Filter audits by managed branches
const audits = managedBranchIds.length > 0 
  ? allAudits.filter(a => managedBranchIds.includes(a.branchId))
  : allAudits

// Stats calculated from filtered audits
const total = audits.length
const inProgress = audits.filter(a => a.status === AuditStatus.IN_PROGRESS).length
const completed = audits.filter(a => a.status === AuditStatus.COMPLETED).length
const pendingApproval = audits.filter(a => a.status === AuditStatus.SUBMITTED)
```

**Key Metric**: **"Needs Approval"** card shows `pendingApproval.length`

## 📊 Dashboard Sections

### 1. **Stats Cards**
- **Needs Approval** (Orange) - Shows SUBMITTED audits count
- **In Progress** (Blue) - Shows IN_PROGRESS audits count  
- **Completion Rate** (Green) - Shows percentage of completed audits

### 2. **Pending Approval Section**
- Lists all SUBMITTED audits for manager's branches
- Click "Review" → Opens audit summary
- Approve/Reject actions available

### 3. **Audit History**
- Shows APPROVED, REJECTED, and COMPLETED audits
- Paginated (10 per page)
- Most recent first

## 🔍 Debugging

### Check Console Logs

The dashboard includes detailed debug logging:
```javascript
console.log('[BM Dashboard] Current user ID:', user?.id)
console.log('[BM Dashboard] Assigned branches:', assignedBranches)
console.log('[BM Dashboard] Managed branch IDs:', managedBranchIds)
console.log('[BM Dashboard] Total audits from API:', allAudits.length)
console.log('[BM Dashboard] Submitted audits (all):', allAudits.filter(a => a.status === AuditStatus.SUBMITTED))
```

### Expected Output After Fix:
```
[BM Dashboard] Current user ID: 9fa9b8c1-45b6-45fe-81e6-efb429b6b6bd
[BM Dashboard] Assigned branches: [{id: '...', name: 'Jahra Branch', ...}]
[BM Dashboard] Managed branch IDs: ['e268b409-28a8-414d-9804-b8f37c74751f']
[BM Dashboard] Submitted audit branch IDs: ['e268b409-28a8-414d-9804-b8f37c74751f']
[BM Dashboard] Branch ID match check: [{auditId: '...', isInManagedBranches: true}]
```

### Verify Branch Manager Assignment in Database:

```sql
-- Check branch manager assignments
SELECT * FROM branch_manager_assignments 
WHERE manager_id = '9fa9b8c1-45b6-45fe-81e6-efb429b6b6bd' 
AND is_active = true;

-- Expected result:
-- Should show Jahra branch (e268b409-28a8-414d-9804-b8f37c74751f)
```

## ✅ Testing Steps

### 1. **Clear Backfill Cache** (if needed):
```javascript
// In browser console
localStorage.removeItem('notificationsBackfilled')
```

### 2. **Refresh Branch Manager Dashboard**
- Should see assigned branches count in header
- Stats should show correct numbers
- Pending approval section should show submitted audits

### 3. **Submit Audit as Auditor**
1. Login as auditor
2. Complete audit for Jahra branch
3. Submit for approval
4. Watch console for notification creation logs

### 4. **Check Branch Manager Dashboard**
1. Login as branch manager
2. Should see notification bell with badge
3. "Needs Approval" card should show correct count
4. Audit should appear in "Pending Approval" section

## 🐛 Troubleshooting

### Issue: "Manage 0 branches" in dashboard header

**Cause**: Branch manager has no active assignments in database

**Solution**: 
```sql
-- Insert assignment (if missing)
INSERT INTO branch_manager_assignments (branch_id, manager_id, assigned_by, is_active)
VALUES (
  'e268b409-28a8-414d-9804-b8f37c74751f', -- Jahra branch ID
  '9fa9b8c1-45b6-45fe-81e6-efb429b6b6bd', -- Branch manager user ID
  'admin',
  true
);
```

### Issue: Pending audits not showing

**Check**:
1. Audit status is `SUBMITTED`
2. Audit branch ID matches manager's assigned branches
3. Branch manager assignment is `is_active = true`

### Issue: Notification not appearing

**Solutions**:
1. Clear localStorage: `localStorage.removeItem('notificationsBackfilled')`
2. Refresh page to trigger backfill
3. Check console for backfill logs
4. Verify notification exists in database:
```sql
SELECT * FROM notifications 
WHERE user_id = '9fa9b8c1-45b6-45fe-81e6-efb429b6b6bd'
ORDER BY created_at DESC;
```

## 📝 Files Modified

1. ✅ `apps/web/src/utils/supabaseApi.ts`
   - Added `getBranchesForManager()` method

2. ✅ `apps/web/src/screens/AuditSummary.tsx`
   - Added notification query invalidation on submit

3. ✅ `apps/web/src/utils/backfillNotifications.ts`
   - Created notification backfill utility

4. ✅ `apps/web/src/components/NotificationDropdown.tsx`
   - Integrated backfill on component mount

## 🚀 Current Status

### ✅ Implemented:
- Branch manager branch assignment retrieval
- Real-time notification creation on audit submission
- Notification backfill for existing audits
- Dashboard stats calculation
- Query invalidation for real-time updates

### 🎯 Expected Behavior:
1. Branch manager sees their assigned branches
2. Dashboard stats match actual audit counts
3. Submitted audits appear in "Needs Approval" section
4. Notifications appear immediately when audits are submitted
5. Approval/rejection updates the dashboard in real-time

## 📞 Next Steps

1. **Refresh your browser** to pick up the new `getBranchesForManager` implementation
2. **Check console logs** to verify branch assignments are loading
3. **Submit a test audit** as auditor to verify notification flow
4. **Verify dashboard stats** match the actual audit counts

---

**Last Updated**: 2025-10-04
**Status**: ✅ Ready for Testing

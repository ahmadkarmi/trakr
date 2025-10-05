# Notification System Debug Guide

## 🔍 How to Debug Notifications

### Step 1: Refresh Browser & Open Console

**Press F12** to open DevTools and go to the **Console** tab.

### Step 2: Look for These Log Messages

#### **Notification Backfill (Runs on Page Load)**
```
🔄 Running notification backfill for user: <user-id>
📊 Found X SUBMITTED audits
⚠️ No managers assigned to branch <branch-id> for audit <audit-id>
  OR
✅ Created notification for manager <manager-id> for audit <audit-id>
📊 Backfill result: X notifications created
✅ Notification backfill complete
```

#### **Notification Fetch (Runs Every 30s)**
```
🔔 Fetching notifications for user: <user-id>
📬 Fetched X notifications: [array of notifications]
```

#### **Notification Creation (When Audit Submitted)**
```
🔔 Creating audit submitted notification for manager: <manager-id>
📤 [Supabase] Creating notification: {userId, type, title, requiresAction}
✅ [Supabase] Notification created successfully: [data]
✅ Notification created successfully (requires action)
```

### Step 3: Check for Errors

**Look for red error messages:**
```
❌ [Supabase] Failed to create notification: <error>
❌ Failed to create audit submitted notification: <error>
❌ Notification backfill failed: <error>
```

## 🧪 Manual Test Steps

### Test 1: Check Existing Notifications

1. **Login as Branch Manager**
2. **Open Console**
3. **Look for:**
   ```
   🔔 Fetching notifications for user: 9fa9b8c1-45b6-45fe-81e6-efb429b6b6bd
   📬 Fetched X notifications: [...]
   ```
4. **Expected:** Should show notifications if any exist

### Test 2: Create New Notification (Submit Audit)

1. **Login as Auditor** (auditor@trakr.com)
2. **Complete and Submit an Audit** for Jahra/Salmiya/Hawally branch
3. **Watch Console for:**
   ```
   🔔 Creating audit submitted notification for manager: 9fa9b8c1-45b6-45fe-81e6-efb429b6b6bd
   📤 [Supabase] Creating notification: {...}
   ✅ [Supabase] Notification created successfully
   ```
4. **Login as Branch Manager**
5. **Check notification bell** - should have badge
6. **Check console:**
   ```
   📬 Fetched 1 notifications: [{...}]
   ```

### Test 3: Verify Database

**Run in Supabase SQL Editor:**

```sql
-- Check notifications for branch manager
SELECT 
  id,
  user_id,
  type,
  title,
  message,
  requires_action,
  action_type,
  is_read,
  created_at
FROM notifications 
WHERE user_id = '9fa9b8c1-45b6-45fe-81e6-efb429b6b6bd'
ORDER BY created_at DESC;

-- Check submitted audits
SELECT 
  id,
  branch_id,
  status,
  submitted_by,
  submitted_at
FROM audits
WHERE status = 'SUBMITTED';

-- Check branch manager assignments
SELECT 
  bma.id,
  bma.branch_id,
  b.name as branch_name,
  bma.manager_id,
  u.email as manager_email
FROM branch_manager_assignments bma
JOIN branches b ON b.id = bma.branch_id
JOIN users u ON u.id = bma.manager_id
WHERE bma.manager_id = '9fa9b8c1-45b6-45fe-81e6-efb429b6b6bd';
```

## 🐛 Common Issues & Fixes

### Issue 1: "Fetched 0 notifications"

**Possible Causes:**
1. No SUBMITTED audits exist
2. No branch manager assignments exist
3. Notifications table is empty

**Fix:**
- Check if branch manager has assigned branches (SQL above)
- Submit a test audit as auditor
- Check notifications table for user_id

### Issue 2: "No managers assigned to branch"

**Cause:** Branch has no manager in `branch_manager_assignments` table

**Fix:**
```sql
INSERT INTO branch_manager_assignments (branch_id, manager_id, assigned_by)
VALUES (
  '<branch-id-from-audit>',
  '9fa9b8c1-45b6-45fe-81e6-efb429b6b6bd',
  '9fa9b8c1-45b6-45fe-81e6-efb429b6b6bd'
);
```

### Issue 3: "Failed to create notification" - Column doesn't exist

**Error:** `column "requires_action" does not exist`

**Fix:** Add missing columns to notifications table:
```sql
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS requires_action boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS action_type text,
ADD COLUMN IF NOT EXISTS action_completed_at timestamptz;
```

### Issue 4: Notifications Created But Not Showing

**Check:**
1. User ID matches: `console.log(user?.id)` should match notification's `user_id`
2. Query is enabled: Should see "🔔 Fetching notifications" in console
3. Query returned data: Should see "📬 Fetched X notifications"

**Force Refetch:**
```javascript
// In browser console
sessionStorage.removeItem('notificationsBackfilled')
location.reload()
```

## 📊 Expected Console Output (Working System)

### On Page Load (Branch Manager):
```
🔄 Running notification backfill for user: 9fa9b8c1-45b6-45fe-81e6-efb429b6b6bd
📊 Found 1 SUBMITTED audits
ℹ️ Notification already exists for manager 9fa9b8c1-45b6-45fe-81e6-efb429b6b6bd and audit abc123
📊 Backfill result: 0 notifications created
✅ Notification backfill complete
🔔 Fetching notifications for user: 9fa9b8c1-45b6-45fe-81e6-efb429b6b6bd
📬 Fetched 1 notifications: [{id: "...", title: "✅ Audit Submitted for Approval", ...}]
```

### On Audit Submit (Auditor):
```
🔔 Creating audit submitted notification for manager: 9fa9b8c1-45b6-45fe-81e6-efb429b6b6bd
📤 [Supabase] Creating notification: {
  userId: "9fa9b8c1-45b6-45fe-81e6-efb429b6b6bd",
  type: "AUDIT_SUBMITTED",
  title: "✅ Audit Submitted for Approval",
  requiresAction: true
}
✅ [Supabase] Notification created successfully: [{...}]
✅ Notification created successfully (requires action)
```

### On Switch to Branch Manager:
```
🔔 Fetching notifications for user: 9fa9b8c1-45b6-45fe-81e6-efb429b6b6bd
📬 Fetched 1 notifications: [{
  id: "...",
  title: "✅ Audit Submitted for Approval",
  message: "Auditor Name submitted an audit for Branch Name",
  requiresAction: true,
  actionType: "REVIEW_AUDIT",
  isRead: false
}]
```

## 🔧 Quick Fixes

### Clear All Cache & Test Fresh
```javascript
// Browser console
localStorage.clear()
sessionStorage.clear()
location.reload()
```

### Manually Create Test Notification
```sql
INSERT INTO notifications (
  user_id,
  type,
  title,
  message,
  link,
  related_id,
  requires_action,
  action_type,
  is_read
) VALUES (
  '9fa9b8c1-45b6-45fe-81e6-efb429b6b6bd',
  'AUDIT_SUBMITTED',
  '✅ Test Notification',
  'This is a test notification',
  '/audits/test/summary',
  'test-audit-id',
  true,
  'REVIEW_AUDIT',
  false
);
```

### Check Notification Bell Component
The bell should show a badge when `unreadCount > 0`.

**Verify in console:**
```javascript
// Should see this query
QK.UNREAD_NOTIFICATIONS: ['notifications', 'unread', '<user-id>']
```

---

## 📝 Summary

**Your notification system has:**
✅ Backfill on page load
✅ Real-time creation on audit submit
✅ Query invalidation for instant updates
✅ Console logging for debugging
✅ Error handling with detailed logs

**To verify it's working:**
1. Clear cache: `sessionStorage.clear()`
2. Refresh page
3. Watch console for backfill logs
4. Check "📬 Fetched X notifications" message
5. If X > 0, notifications are working!
6. If X = 0, check database queries above

---

**Last Updated**: 2025-10-04
**Status**: 🔍 Debug Mode Active (console logging enabled)

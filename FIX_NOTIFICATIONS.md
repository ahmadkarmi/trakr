# 🔔 Notification System Fix

## Problem Identified

**Notifications were not being created because of restrictive RLS policies!**

### Root Cause:
The `notifications` table RLS policy only allowed `service_role` to INSERT notifications:
```sql
GRANT INSERT ON notifications TO service_role; -- ❌ Too restrictive!
```

When authenticated users (auditors, managers) tried to create notifications, they were **silently blocked** by RLS policies.

## Solution

Created migration: `supabase/migrations/20250104000001_fix_notification_permissions.sql`

This migration:
1. ✅ Drops the old restrictive policy
2. ✅ Creates new policy allowing authenticated users to create notifications
3. ✅ Grants INSERT permission to authenticated role

## How to Apply the Fix

### Option 1: Via Supabase CLI (Recommended)
```bash
# Navigate to project root
cd d:\Dev\Apps\Trakr

# Apply the migration
npx supabase db push
```

### Option 2: Via Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Paste the content from `supabase/migrations/20250104000001_fix_notification_permissions.sql`
5. Click **Run**

### Option 3: Via psql
```bash
psql -h <your-db-host> -U postgres -d postgres -f supabase/migrations/20250104000001_fix_notification_permissions.sql
```

## Verification

After applying the migration, test notifications:

### 1. Check Console Logs
Watch browser console for these messages:
- 🔔 Creating audit submitted notification for manager: [manager-id]
- ✅ Notification created successfully

### 2. Test Flow
1. **As Auditor:**
   - Create and submit an audit
   - Check console for success logs

2. **As Branch Manager:**
   - Refresh page after ~30 seconds
   - Check bell icon for red badge
   - Open notifications dropdown
   - Should see "✅ Audit Submitted for Approval"

### 3. Database Check
```sql
-- Check if notifications are being created
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;

-- Check notification count per user
SELECT user_id, COUNT(*) as notification_count 
FROM notifications 
GROUP BY user_id;
```

## Persistence Requirements (As Requested)

**Actionable notifications remain persistent until action is taken:**

### Implementation Plan:
1. Add `requires_action` boolean field to notifications table
2. Add `action_type` enum field (e.g., 'APPROVE_AUDIT', 'REJECT_AUDIT')
3. Modify notification creation to set `requires_action = true` for submission notifications
4. Auto-dismiss action notifications when the related action is completed
5. Red dot persists until action taken (not just read)

### Migration for Persistence:
```sql
-- Add action tracking fields
ALTER TABLE notifications 
ADD COLUMN requires_action BOOLEAN DEFAULT FALSE,
ADD COLUMN action_type TEXT,
ADD COLUMN action_completed_at TIMESTAMPTZ;

-- Update audit submitted notifications to require action
UPDATE notifications 
SET requires_action = true, 
    action_type = 'REVIEW_AUDIT'
WHERE type = 'AUDIT_SUBMITTED';
```

## Next Steps

1. ✅ Apply the migration (fixes notification creation)
2. 🔄 Test notification flow with all roles
3. 🔄 Implement persistence logic (requires_action field)
4. 🔄 Update NotificationDropdown to handle actionable notifications differently

## Files Modified

1. ✅ `supabase/migrations/20250104000001_fix_notification_permissions.sql` - NEW
2. ✅ `apps/web/src/utils/notifications.ts` - Added detailed logging
3. ✅ `apps/web/src/screens/AuditSummary.tsx` - Added submission notification trigger

## Expected Behavior After Fix

| Event | Notification To | Persistent? | Dismisses When |
|-------|----------------|-------------|----------------|
| Audit Submitted | Branch Manager | ✅ Yes | Approve/Reject |
| Audit Approved | Auditor | ❌ No | Marked as read |
| Audit Rejected | Auditor | ❌ No | Marked as read |

**Note:** To implement full persistence for actionable notifications, apply the additional migration above and update the notification logic.

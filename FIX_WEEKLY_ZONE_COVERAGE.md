# Fix: Weekly Zone Coverage Not Showing

## Problem
After activating branches/auditors and making the survey weekly, the **Weekly Zone Coverage** section on the Admin Dashboard shows "No zones or audits this period."

## Root Cause
The weekly audit scheduling system (`schedule-weekly-audits` Edge Function) **requires auditor-to-branch assignments** before creating audits. Even though you've:
- ✅ Activated all branches
- ✅ Made the survey weekly (frequency)
- ✅ Activated auditors

The system still needs you to **assign auditors to branches** before audits can be scheduled.

### Why This Design?
The scheduling logic (line 128-131 in `supabase/functions/schedule-weekly-audits/index.ts`):
```typescript
let assignedTo: string | null = null
const { data: assigns } = await admin.from("auditor_branch_assignments")
  .select("user_id, branch_id, period_start, period_end")
  .eq("branch_id", branchId)
if (assigns && assigns.length === 1) assignedTo = assigns[0].user_id as string
// Skip creation if no explicit auditor assignment exists
if (!assignedTo) { 
  summary.skipped++; 
  orgResult.skipped++; 
  surveyResult.skipped++; 
  continue 
}
```

This ensures audits are only created for branches that have a clear owner responsible for completing them.

---

## ✅ Solution: Assign Auditors to Branches

### Method 1: Zone-Based Assignment (RECOMMENDED for bulk)

**Best for**: Assigning multiple branches at once to an auditor

1. **Navigate to Assignments**
   - Admin Dashboard → Click **"Manage Auditor Assignments"** button
   - Or go to: `/manage/assignments`

2. **Create Zones** (if not already created)
   - Group your branches into logical zones (e.g., "North Region", "Downtown Area")
   - Navigate to: Admin Dashboard → "Manage Zones"
   - Create zones and assign branches to them

3. **Assign Zone to Auditor**
   - On the Manage Assignments screen, you'll see:
     - **Zone Assign Panel** at the top (dropdowns for Auditor + Zone)
     - **Kanban Board** below showing Unassigned and Auditor columns

4. **Steps**:
   - Select an **Auditor** from the first dropdown
   - Select a **Zone** from the second dropdown
   - Click **"Assign Zone"**
   - Confirm the assignment in the modal
   - ✅ All branches in that zone are now assigned to the auditor!

### Method 2: Manual Branch Assignment (for individual branches)

**Best for**: Fine-grained control or exceptions

1. **Navigate to Assignments**
   - Admin Dashboard → "Manage Auditor Assignments"

2. **Drag & Drop Assignment**
   - On the Kanban board, you'll see:
     - **Unassigned** column (left) - branches without auditors
     - **Auditor columns** (right) - one column per auditor
   - Drag a branch card from "Unassigned" to an auditor's column
   - Drop it → The branch is now assigned!

3. **Reassignment**
   - Drag a branch from one auditor's column to another
   - System will handle audit handoffs appropriately

---

## 🔄 Trigger Weekly Scheduling

After assigning auditors, you need to trigger the scheduler:

### Option A: Automatic (Wait for Next Cycle)
The scheduler runs automatically at the start of each week (based on your org's `weekStartsOn` setting).

### Option B: Manual Trigger (Immediate)
Run the scheduler manually via the Edge Function:

**Using Supabase Dashboard:**
1. Go to: Supabase Dashboard → Edge Functions
2. Find: `schedule-weekly-audits`
3. Click "Invoke"
4. Body:
```json
{
  "org_id": "your-org-id",
  "survey_id": "your-survey-id",
  "dry_run": false
}
```
5. Click "Execute"

**Using curl:**
```bash
curl -X POST \
  'https://your-project.supabase.co/functions/v1/schedule-weekly-audits' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "org_id": "your-org-id",
    "survey_id": "your-survey_id"
  }'
```

**Response Example:**
```json
{
  "created": 12,
  "skipped": 0,
  "orgs": [
    {
      "orgId": "org-123",
      "created": 12,
      "skipped": 0,
      "surveys": [
        {
          "surveyId": "survey-456",
          "created": 12,
          "skipped": 0
        }
      ]
    }
  ]
}
```

---

## ✅ Verify It's Working

### 1. Check Audit Creation
After running the scheduler, check:
```sql
SELECT 
  a.id,
  a.branch_id,
  a.assigned_to,
  a.status,
  a.period_start,
  a.period_end,
  a.created_origin,
  b.name as branch_name,
  u.full_name as auditor_name
FROM audits a
JOIN branches b ON b.id = a.branch_id
JOIN users u ON u.id = a.assigned_to
WHERE a.period_start >= date_trunc('week', now())
  AND a.is_archived = false
ORDER BY a.created_at DESC;
```

You should see:
- ✅ Audits created for this week's period
- ✅ `assigned_to` populated with auditor IDs
- ✅ `created_origin` = 'SYSTEM_SCHEDULED'
- ✅ `status` = 'DRAFT'

### 2. Check Admin Dashboard
Refresh your Admin Dashboard:
- **Weekly Zone Coverage** section should now show:
  - Zone names
  - Scheduled count (audits for this week)
  - Completed count
  - Overdue count

### 3. Check Auditor Dashboard
Log in as an auditor:
- They should see assigned audits in their "My Audits" section
- Can click "Start Audit" to begin

---

## 📊 Understanding the Weekly Zone Coverage Calculation

The Admin Dashboard shows zone coverage based on:

**Source Code** (`apps/web/src/screens/DashboardAdmin.tsx`, lines 318-329):
```typescript
const zoneRows = React.useMemo(() => {
  const rows = zones.map((z) => {
    const bids = new Set(z.branchIds)
    const list = weeklyAudits.filter((a) => bids.has(a.branchId))
    const scheduled = list.length
    const completed = list.filter((a) => 
      a.status === AuditStatus.COMPLETED || 
      a.status === AuditStatus.APPROVED
    ).length
    const overdue = list.filter(a => 
      isOverdue(a) && 
      a.status !== AuditStatus.COMPLETED && 
      a.status !== AuditStatus.APPROVED
    ).length
    return { id: z.id, name: z.name, scheduled, completed, overdue }
  }).sort((a, b) => b.scheduled - a.scheduled).slice(0, 5)
  return rows
}, [zones, weeklyAudits, isOverdue])
```

**Key Points**:
1. **Scheduled** = Total audits for this week in the zone
2. **Completed** = Audits with status COMPLETED or APPROVED
3. **Overdue** = Audits past due date that are not completed/approved
4. Shows **top 5 zones** by scheduled count
5. Only counts audits whose `periodStart`/`periodEnd` overlap with the current week

---

## 🚨 Common Issues & Troubleshooting

### Issue 1: "No zones or audits this period"
**Cause**: No audits created for this week  
**Fix**: 
1. Verify auditor assignments exist
2. Run scheduler manually
3. Check survey is marked `is_active = true`
4. Check survey `frequency = 'WEEKLY'`

### Issue 2: Scheduler returns `"created": 0, "skipped": X`
**Cause**: Missing auditor assignments  
**Fix**: Assign auditors to branches (see Method 1 or 2 above)

### Issue 3: Audits created but zone coverage still shows 0
**Cause**: Branches might not be in any zone  
**Fix**:
1. Navigate to "Manage Zones"
2. Edit zones and add branches
3. Or check that `zone_branches` table has correct mappings:
```sql
SELECT z.name, b.name as branch_name
FROM zones z
JOIN zone_branches zb ON zb.zone_id = z.id
JOIN branches b ON b.id = zb.branch_id
ORDER BY z.name, b.name;
```

### Issue 4: Wrong week showing
**Cause**: Organization timezone or `weekStartsOn` mismatch  
**Fix**: 
1. Go to Settings → Organization Settings (as Admin)
2. Verify **Timezone** is correct
3. Verify **Week Starts On** (Sunday = 0, Monday = 1)

### Issue 5: Scheduler runs but audits are for wrong period
**Cause**: Period calculation based on org timezone  
**Fix**: Verify org timezone setting matches your actual location

---

## 🎯 Recommended Workflow

For a smooth weekly audit process:

### Initial Setup (One-time)
1. ✅ Create organization with correct timezone
2. ✅ Create branches and activate them
3. ✅ Create zones grouping branches
4. ✅ Create weekly survey and publish
5. ✅ Create auditor users and activate them
6. ✅ **Assign auditors to zones/branches** ← Critical step!

### Weekly Cycle
1. **Scheduler runs** (automatically at week start)
   - Creates DRAFT audits for all assigned branches
   - Audits are pre-assigned to auditors
   
2. **Auditors complete audits**
   - Log in, see "My Audits"
   - Complete before due date
   
3. **Branch Managers approve**
   - Review submitted audits
   - Approve or reject with comments
   
4. **Admins monitor**
   - Check Weekly Zone Coverage
   - Identify overdue audits
   - Reassign if needed

---

## 🔧 Quick Commands

### Check Assignment Status
```sql
-- See which branches have auditor assignments
SELECT 
  b.name as branch,
  u.full_name as auditor,
  a.created_at
FROM auditor_branch_assignments a
JOIN branches b ON b.id = a.branch_id
JOIN users u ON u.id = a.user_id
ORDER BY b.name;
```

### Check Weekly Audits
```sql
-- See this week's audits
SELECT 
  COUNT(*) as total_audits,
  COUNT(*) FILTER (WHERE assigned_to IS NOT NULL) as assigned,
  COUNT(*) FILTER (WHERE assigned_to IS NULL) as unassigned,
  COUNT(*) FILTER (WHERE status = 'DRAFT') as draft,
  COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as in_progress,
  COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed
FROM audits
WHERE period_start >= date_trunc('week', now())
  AND is_archived = false;
```

### Manual Scheduler Invocation (SQL)
```sql
-- Get org and survey IDs
SELECT id, name FROM organizations;
SELECT id, title, frequency FROM surveys WHERE is_active = true;

-- Then use Edge Function with those IDs
```

---

## 📝 Summary

**The Fix**:
1. Go to **Manage Auditor Assignments** (`/manage/assignments`)
2. **Assign auditors to zones** or drag branches to auditor columns
3. **Run scheduler** (manual trigger or wait for next week)
4. **Refresh dashboard** - Weekly Zone Coverage should now populate!

**Key Insight**: Weekly scheduling requires auditor assignments to exist **before** audits are created. This ensures accountability and prevents orphaned audits.

---

## 🎨 Future UI Improvement Suggestions

Consider adding to the Admin Dashboard:
1. **Warning badge** on "Weekly Zone Coverage" when no assignments exist
2. **"Schedule Audits Now"** button to manually trigger scheduler
3. **Assignment status indicator** showing X/Y branches assigned
4. **Quick assign** flow directly from dashboard

Would you like me to implement any of these improvements?

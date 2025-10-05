# Assignment Tables Setup Guide

This guide explains how to set up the Branch Manager and Auditor Assignment tables in Supabase.

---

## 📋 Overview

The assignment tables enable:
- **Multiple Branch Managers** per branch
- **Flexible Auditor Assignments** to branches and zones
- **Persistent storage** of assignment data
- **Row Level Security (RLS)** for proper access control

---

## 🗄️ Tables Created

### 1. `branch_manager_assignments`
Stores assignments of managers to branches (many-to-many relationship).

**Columns:**
- `id` - UUID primary key
- `branch_id` - Foreign key to branches table
- `manager_id` - Foreign key to users table
- `assigned_by` - User who created the assignment
- `assigned_at` - Timestamp of assignment
- `created_at` - Record creation time
- `updated_at` - Last update time

**Constraints:**
- UNIQUE(branch_id, manager_id) - Prevents duplicate assignments

### 2. `auditor_assignments`
Stores auditor assignments to branches and zones.

**Columns:**
- `id` - UUID primary key
- `user_id` - Foreign key to users table (UNIQUE)
- `branch_ids` - Array of branch UUIDs
- `zone_ids` - Array of zone UUIDs
- `created_at` - Record creation time
- `updated_at` - Last update time

---

## 🚀 Setup Instructions

### Step 1: Run the Migration

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy the contents of `scripts/03-add-assignments-tables.sql`
5. Click **Run** to execute the migration

### Step 2: Verify Tables Were Created

Run this query to verify:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('branch_manager_assignments', 'auditor_assignments');

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('branch_manager_assignments', 'auditor_assignments');
```

Expected output:
- Both tables should appear in the first query
- `rowsecurity` should be `true` for both tables

### Step 3: Configure Environment Variables

Update your `apps/web/.env.local` file:

```env
VITE_BACKEND=supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Step 4: Test the Implementation

1. **Start the dev server:**
   ```bash
   cd apps/web
   npm run dev
   ```

2. **Login as Admin**

3. **Navigate to Manage Branches**

4. **Test Manager Assignments:**
   - Click on a branch card
   - Click "Manage Managers" button
   - Use the sticky footer button "Add Branch Manager"
   - Assign and unassign managers
   - Verify data persists after page refresh

5. **Test Auditor Assignments:**
   - Click on a branch card
   - Click "Manage Auditors" button
   - Use the sticky footer button "Add Auditors"
   - Assign and unassign auditors
   - Verify data persists after page refresh

---

## 🔒 RLS Policies

### Branch Manager Assignments

**Admins can:**
- ✅ View all assignments
- ✅ Create assignments
- ✅ Delete assignments

**Branch Managers can:**
- ✅ View their own assignments (read-only)

### Auditor Assignments

**Admins & Branch Managers can:**
- ✅ View all assignments
- ✅ Create/Update/Delete assignments

**Auditors can:**
- ✅ View their own assignments (read-only)

---

## 📊 Database Schema Diagram

```
┌─────────────────────────────────┐
│ branch_manager_assignments      │
├─────────────────────────────────┤
│ id (PK)                         │
│ branch_id (FK → branches)       │
│ manager_id (FK → users)         │
│ assigned_by (FK → users)        │
│ assigned_at                     │
│ created_at                      │
│ updated_at                      │
└─────────────────────────────────┘
           │
           │ Many-to-Many
           ↓
┌─────────────────────────────────┐
│ branches                        │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ auditor_assignments             │
├─────────────────────────────────┤
│ id (PK)                         │
│ user_id (FK → users, UNIQUE)    │
│ branch_ids (UUID[])             │
│ zone_ids (UUID[])               │
│ created_at                      │
│ updated_at                      │
└─────────────────────────────────┘
```

---

## 🔧 API Methods Implemented

### Branch Manager Assignments

```typescript
// Get all assignments for a branch
api.getBranchManagerAssignments(branchId: string)

// Assign a manager to a branch
api.assignBranchManager(branchId: string, managerId: string, assignedBy: string)

// Unassign a manager from a branch
api.unassignBranchManager(branchId: string, managerId: string, unassignedBy: string)
```

### Auditor Assignments

```typescript
// Get all auditor assignments
api.getAuditorAssignments()

// Get assignments for a specific branch
api.getAuditorAssignmentsByBranch(branchId: string)

// Get assignment for a specific auditor
api.getAuditorAssignment(auditorId: string)

// Assign auditor to branches and zones
api.assignAuditor(auditorId: string, branchIds: string[], zoneIds: string[])
```

---

## 🐛 Troubleshooting

### Issue: "Permission denied for table"

**Solution:** Verify RLS policies are set up correctly:

```sql
-- Check policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('branch_manager_assignments', 'auditor_assignments');
```

### Issue: "relation does not exist"

**Solution:** The migration hasn't been run. Execute `03-add-assignments-tables.sql`.

### Issue: Data not persisting

**Solution:** Check that `VITE_BACKEND=supabase` is set in your `.env.local` file.

### Issue: Can't see assignments

**Solution:** Verify the logged-in user has the correct role:

```sql
-- Check your user's role
SELECT id, email, role FROM users WHERE email = 'your-email@example.com';
```

---

## 🎯 Testing Checklist

- [ ] Migration executed successfully
- [ ] Tables exist in Supabase
- [ ] RLS is enabled on both tables
- [ ] Environment variables configured
- [ ] Can assign managers to branches
- [ ] Can unassign managers from branches
- [ ] Can assign auditors to branches
- [ ] Can assign auditors to zones
- [ ] Data persists after page refresh
- [ ] Empty states display correctly
- [ ] Sticky footer buttons work
- [ ] Modals convert to bottom sheets on mobile

---

## 📝 Notes

- **Migration Order:** Run migrations in order (01, 02, 03)
- **Backwards Compatible:** Old code will fall back to mockApi if these tables don't exist
- **Performance:** Indexes are created for fast lookups
- **Audit Trail:** `assigned_by` tracks who made assignments
- **Unique Constraint:** Prevents duplicate manager assignments to same branch
- **Array Support:** PostgreSQL arrays used for flexible auditor assignments

---

## 🔗 Related Files

- **Migration:** `scripts/03-add-assignments-tables.sql`
- **API Implementation:** `apps/web/src/utils/supabaseApi.ts`
- **UI Components:**
  - `apps/web/src/components/BranchManagerAssignments.tsx`
  - `apps/web/src/components/BranchAuditorAssignments.tsx`
- **Bottom Sheets:** `apps/web/src/screens/ManageBranches.tsx`

---

## ✅ Success Indicators

You'll know the setup is working when:

1. ✅ No console warnings about "Falling back to mockApi"
2. ✅ Assignments persist after page refresh
3. ✅ Sticky footer buttons trigger assignment modals
4. ✅ Bottom sheets slide up smoothly on mobile
5. ✅ RLS prevents unauthorized access
6. ✅ Multiple managers can be assigned to one branch
7. ✅ Auditors can be assigned to multiple branches/zones

---

*Last Updated: 2025-01-04*
*Version: 1.0.0*

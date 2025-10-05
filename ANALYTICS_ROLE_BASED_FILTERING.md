# Analytics Role-Based Data Filtering Guide

This document outlines the proper role-based filtering for analytics data in Trakr.

---

## 🎯 Overview

The analytics section must show different data based on user roles:
- **Admin/Super Admin**: See ALL data across the organization
- **Branch Manager**: See ONLY data for their assigned branches
- **Auditor**: See ONLY their own audits

---

## 🔐 Current Implementation Status

### ✅ Admin Analytics (apps/web/src/screens/analytics/AdminAnalytics.tsx)
**Status**: CORRECT ✓

```typescript
const { data: audits = [] } = useQuery<Audit[]>({ 
  queryKey: QK.AUDITS('admin'), 
  queryFn: () => api.getAudits() // Gets ALL audits
})
const { data: branches = [] } = useQuery<Branch[]>({ 
  queryKey: ['branches'], 
  queryFn: () => api.getBranches() // Gets ALL branches
})
const { data: users = [] } = useQuery<User[]>({ 
  queryKey: ['users'], 
  queryFn: () => api.getUsers() // Gets ALL users
})
```

**What it shows:**
- Total system audits
- All branches
- All users
- System-wide completion rates
- Branch performance matrix
- Auditor rankings

---

### ⚠️ Branch Manager Analytics (apps/web/src/screens/analytics/BranchManagerAnalytics.tsx)
**Status**: NEEDS UPDATE ⚠️

**Current Issue:**
- Uses OLD single-manager schema: `branches.find((b: Branch) => b.managerId === user?.id)`
- Does NOT support multiple branch managers per branch

**Required Fix:**
```typescript
// 1. Fetch branch manager assignments
const { data: myAssignments = [] } = useQuery({
  queryKey: ['branch-manager-assignments', user?.id],
  queryFn: () => user?.id ? api.getBranchManagerAssignments(user.id) : Promise.resolve([]),
  enabled: !!user?.id,
})

// 2. Get all branches this manager is assigned to
const myBranchIds = React.useMemo(() => 
  myAssignments.map(a => a.branchId),
  [myAssignments]
)

const myBranches = React.useMemo(() => 
  branches.filter(b => myBranchIds.includes(b.id)),
  [branches, myBranchIds]
)

// 3. Filter audits to ONLY assigned branches
const branchAudits = audits.filter(a => myBranchIds.includes(a.branchId))
```

**What it should show:**
- Audits ONLY from assigned branches
- Team members ONLY from assigned branches
- Performance ONLY for assigned branches
- Multiple branches if manager is assigned to multiple

---

### ✅ Auditor Analytics (apps/web/src/screens/analytics/AuditorAnalytics.tsx)
**Status**: CORRECT ✓

```typescript
const { data: audits = [] } = useQuery<Audit[]>({ 
  queryKey: QK.AUDITS('auditor'), 
  queryFn: () => api.getAudits() 
})

// Filter to only current user's audits
const myAudits = audits.filter(a => a.assignedTo === user?.id)
```

**What it shows:**
- Only audits assigned to the current user
- Personal completion rate
- Personal quality scores
- Comparison with team averages (anonymized)

---

## 🛠️ Required API Methods

### 1. getBranchManagerAssignments (for a specific manager)
**File**: `apps/web/src/utils/supabaseApi.ts`
**Status**: ✅ IMPLEMENTED

```typescript
async getBranchManagerAssignments(branchId: string) {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('branch_manager_assignments')
    .select('*')
    .eq('branch_id', branchId)
    .order('assigned_at', { ascending: false })
  
  if (error) throw error
  return (data || []).map((row: any) => ({
    id: row.id,
    branchId: row.branch_id,
    managerId: row.manager_id,
    assignedBy: row.assigned_by,
    assignedAt: new Date(row.assigned_at),
  }))
}
```

**Note**: This currently gets assignments BY BRANCH. We need a method to get BY MANAGER:

```typescript
async getManagerBranchAssignments(managerId: string) {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('branch_manager_assignments')
    .select('*')
    .eq('manager_id', managerId)
    .order('assigned_at', { ascending: false })
  
  if (error) throw error
  return (data || []).map((row: any) => ({
    id: row.id,
    branchId: row.branch_id,
    managerId: row.manager_id,
    assignedBy: row.assigned_by,
    assignedAt: new Date(row.assigned_at),
  }))
}
```

---

## 🔒 Row Level Security (RLS) Policies

The Supabase RLS policies should enforce data access:

### Audits Table RLS
```sql
-- Admins see all audits
CREATE POLICY "Admins can view all audits"
  ON audits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- Branch Managers see audits from their assigned branches
CREATE POLICY "Branch managers can view their branch audits"
  ON audits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM branch_manager_assignments bma
      JOIN users u ON u.id = auth.uid()
      WHERE bma.manager_id = auth.uid()
      AND bma.branch_id = audits.branch_id
      AND u.role = 'BRANCH_MANAGER'
    )
  );

-- Auditors see only their assigned audits
CREATE POLICY "Auditors can view their own audits"
  ON audits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'AUDITOR'
      AND audits.assigned_to = auth.uid()
    )
  );
```

---

## 📊 Data Filtering Summary

| Role | Audits | Branches | Users | Zones |
|------|--------|----------|-------|-------|
| **Admin** | All | All | All | All |
| **Branch Manager** | Assigned branches only | Assigned branches only | Team members only | Relevant zones only |
| **Auditor** | Own audits only | Can see branch names | Cannot see users | Cannot see zones |

---

## 🎨 UI Updates Needed

### Branch Manager Analytics
1. **Header subtitle**: Should show `"X branches"` if multiple branches
2. **Branch Performance**: Should list all assigned branches with individual metrics
3. **Team Members**: Should aggregate from all assigned branches
4. **Empty State**: If no branches assigned, show warning message

**Example:**
```tsx
{myBranches.length === 0 ? (
  <div className="text-center py-8 bg-yellow-50 rounded-lg">
    <p className="text-lg font-medium text-yellow-900">No Branch Assignments</p>
    <p className="text-sm text-yellow-700">Contact your administrator.</p>
  </div>
) : (
  // Show branch performance
)}
```

---

## 🧪 Testing Checklist

### Admin
- [ ] Can see all audits from all branches
- [ ] Can see all branch performance metrics
- [ ] Can see all auditor rankings
- [ ] Total counts are system-wide

### Branch Manager
- [ ] Can ONLY see audits from assigned branches
- [ ] If assigned to multiple branches, sees data from all assigned
- [ ] Cannot see audits from unassigned branches
- [ ] Team members list only includes auditors from assigned branches

### Auditor
- [ ] Can ONLY see own audits
- [ ] Cannot see other auditors' data
- [ ] Can see anonymized team averages for comparison
- [ ] Cannot access admin or branch manager analytics

---

## 🚀 Implementation Steps

1. **Add new API method** `getManagerBranchAssignments(managerId)`
2. **Update BranchManagerAnalytics.tsx** to use branch_manager_assignments
3. **Test with multiple branch managers** per branch
4. **Test with single manager** on multiple branches
5. **Add empty state** for managers with no assignments
6. **Verify RLS policies** in Supabase dashboard
7. **Run E2E tests** for each role
8. **Document** any limitations or edge cases

---

## 📝 Notes

- RLS policies in Supabase provide server-side enforcement
- Client-side filtering provides UI optimization
- Both should work together for security AND performance
- Always test with real Supabase data, not mockApi

---

## 🔗 Related Files

- `apps/web/src/screens/analytics/AdminAnalytics.tsx`
- `apps/web/src/screens/analytics/BranchManagerAnalytics.tsx`
- `apps/web/src/screens/analytics/AuditorAnalytics.tsx`
- `apps/web/src/utils/supabaseApi.ts`
- `scripts/03-add-assignments-tables.sql`

---

*Last Updated: 2025-01-04*
*Status: Documentation Complete - Implementation Required*

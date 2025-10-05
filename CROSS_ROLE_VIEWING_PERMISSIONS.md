# Cross-Role Viewing Permissions Guide

This document explains how branch managers and auditors can view each other's sections with appropriate read-only restrictions.

---

## Menu Structure

### **Admin**
- My Dashboard (admin)
- Analytics
- Survey Templates
- Manage Branches
- Manage Zones
- Manage Users
- Activity Logs

### **Branch Manager**
- My Dashboard (branch manager) - **Can edit approvals**
- Analytics
- Audits - **View only** (links to auditor dashboard)

### **Auditor**
- My Dashboard (auditor) - **Can edit audits**
- Analytics  
- Approvals - **View only** (links to branch manager dashboard)

---

## Data Filtering

### **Branch Manager Viewing Audits** (`/dashboard/auditor`)
**What they see:**
- Only audits from branches they manage
- Filter: `audit.branchId IN [managedBranchIds]`

**What they can do:**
- ✅ View audit details
- ✅ See audit progress/status
- ❌ Cannot edit audits
- ❌ Cannot submit audits
- ❌ Cannot delete audits

**State machine permissions:**
```typescript
// When BRANCH_MANAGER views any audit:
{
  canViewOnly: true,
  canEdit: false,
  canSubmit: false,
  canDelete: false
}
```

---

### **Auditor Viewing Approvals** (`/dashboard/branch-manager`)
**What they see:**
- Only audits they created/are assigned to
- Filter: `audit.assignedTo === auditor.id`

**What they can do:**
- ✅ View submitted audits
- ✅ See approval status
- ✅ See rejection feedback (if rejected)
- ❌ Cannot approve audits
- ❌ Cannot reject audits

**State machine permissions:**
```typescript
// When AUDITOR views SUBMITTED audit:
{
  canViewOnly: true,
  canEdit: false,
  canSubmit: false,
  canApprove: false, // Only managers can approve
}

// When AUDITOR views REJECTED audit:
{
  canViewOnly: false,
  canEdit: true, // Can fix issues
  canResubmit: true
}
```

---

## Permission Rules (Already Implemented)

The `useAuditStateMachine` hook automatically enforces these rules:

### **Rule 1: View-Only for Wrong Role**
```typescript
// Branch manager viewing DRAFT/IN_PROGRESS audit
if (userRole === BRANCH_MANAGER && status !== SUBMITTED) {
  return { canViewOnly: true, canEdit: false }
}
```

### **Rule 2: Auditors Can't Approve**
```typescript
// Auditor viewing SUBMITTED audit
if (userRole === AUDITOR && status === SUBMITTED) {
  return { canViewOnly: true, showWarning: 'Waiting for manager review' }
}
```

### **Rule 3: Managers Can Approve**
```typescript
// Branch manager viewing SUBMITTED audit
if (userRole === BRANCH_MANAGER && status === SUBMITTED) {
  return { 
    canViewOnly: true,
    canApprove: true,
    canReject: true,
    nextAction: 'Review and approve or reject'
  }
}
```

---

## UI Components That Enforce Permissions

### **1. AuditActionGuard**
Hides/disables buttons based on permissions:

```typescript
// Edit button only shows if canEdit = true
<AuditActionGuard permissions={permissions} action="edit">
  <button onClick={handleEdit}>Edit Audit</button>
</AuditActionGuard>

// Approve button only shows if canApprove = true (managers only)
<AuditActionGuard permissions={permissions} action="approve">
  <button onClick={handleApprove}>Approve</button>
</AuditActionGuard>
```

### **2. AuditStatusBanner**
Shows appropriate messages for each role:

**Branch Manager viewing IN_PROGRESS audit:**
> ℹ️ "This audit is still being worked on by the auditor."

**Auditor viewing SUBMITTED audit:**
> ℹ️ "This audit has been submitted and is awaiting manager review. You cannot edit it while under review."

---

## Real-World Examples

### **Example 1: Auditor Checks Approval Status**

1. Auditor logs in
2. Clicks **"Approvals"** in menu
3. Sees their submitted audits with statuses:
   - ✅ "Approved" (green badge)
   - ⏳ "Submitted for Review" (yellow badge)
   - ❌ "Rejected - Needs Revision" (red badge)
4. Can click on rejected audits to see feedback
5. Can edit and resubmit rejected audits
6. **Cannot** approve or reject any audits

---

### **Example 2: Branch Manager Checks Audit Progress**

1. Branch Manager logs in
2. Clicks **"Audits"** in menu
3. Sees audits from their managed branches:
   - 📝 "Draft" - 30% complete
   - 🔄 "In Progress" - 70% complete
   - ✅ "Completed" - 100% complete
4. Can click to view audit details
5. Can see which questions are answered
6. **Cannot** edit answers or submit
7. **Must wait** for auditor to submit before they can approve

---

## Benefits of This Approach

✅ **Transparency** - Everyone can see the full workflow  
✅ **Accountability** - Auditors see if their work is approved/rejected  
✅ **Progress Tracking** - Managers see what's in progress  
✅ **No Permission Leaks** - State machine enforces rules automatically  
✅ **Clear Boundaries** - Visual indicators show what's editable  

---

## Technical Implementation

### **Data Flow**

```
AUDITOR DASHBOARD
  └─ Fetches: api.getAudits({ assignedTo: auditorId })
  └─ Filters: Only their assigned audits
  └─ Permissions: Can edit DRAFT/IN_PROGRESS/REJECTED

BRANCH MANAGER DASHBOARD  
  └─ Fetches: api.getAudits()
  └─ Filters: audit.branchId IN [managedBranchIds]
  └─ Permissions: Can approve SUBMITTED, view others

CROSS-VIEWING
  ├─ Branch Manager → /dashboard/auditor
  │   └─ Sees filtered audits (same data, different permissions)
  │   └─ State machine: canEdit = false
  │
  └─ Auditor → /dashboard/branch-manager
      └─ Sees filtered audits (same data, different permissions)
      └─ State machine: canApprove = false
```

---

## Testing Cross-Role Viewing

### **Test 1: Branch Manager Views Audits**
1. Login as **branch manager**
2. Click **"Audits"** menu item
3. Should see audits from managed branches
4. Click on an IN_PROGRESS audit
5. Verify **no edit buttons** appear
6. Should see message: "This audit is being worked on by the auditor"

### **Test 2: Auditor Views Approvals**
1. Login as **auditor**
2. Complete and submit an audit
3. Click **"Approvals"** menu item
4. Should see their submitted audit with "Submitted for Review" status
5. Click on the audit
6. Verify **no approve/reject buttons** appear
7. Should see message: "Awaiting manager review"

### **Test 3: Full Workflow**
1. **Auditor** creates and submits audit
2. **Auditor** checks "Approvals" → sees "Submitted"
3. **Manager** checks "Audits" → sees "In Progress" (before submission)
4. **Manager** checks own dashboard → sees "Pending Approval"
5. **Manager** approves audit
6. **Auditor** checks "Approvals" → sees "Approved" ✅

---

## Summary

🎯 **Goal Achieved:**  
Both branch managers and auditors can view each other's sections for transparency, while the state machine ensures they can only edit what they're authorized to edit.

✅ **Permissions enforced at:**
- Menu level (showing correct items)
- Data level (filtering by assignments)
- UI level (hiding/disabling buttons)
- API level (validation on server)

🔒 **Security:**
All permission checks happen both client-side (UX) and server-side (validation).

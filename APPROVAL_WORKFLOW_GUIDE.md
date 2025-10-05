# Branch Manager Approval Workflow - Complete Guide

This guide explains the complete audit approval workflow from submission to approval/rejection.

---

## 📋 Overview

The approval workflow follows this path:

```
AUDITOR                    BRANCH MANAGER              SYSTEM
   │                            │                        │
   ├─ Complete audit            │                        │
   ├─ Submit for approval  →    │                        │
   │                            ├─ Review audit          │
   │                            ├─ Approve/Reject   →    │
   │                            │                        ├─ Update status
   │                            │                        ├─ Send notification
   │                            │                        │
   │  ← Notification (if rejected)                      │
   ├─ Fix issues (if rejected)  │                        │
   ├─ Resubmit             →    │                        │
   │                            ├─ Re-review             │
   │                            └─ Approve          →    └─ APPROVED
```

---

## 🎯 What Was Built

### **1. Audit Review Screen** ✅
**File:** `apps/web/src/screens/AuditReviewScreen.tsx`

**Features:**
- Read-only view of all audit answers
- Section-by-section progress tracking
- Approve/Reject buttons with confirmation dialogs
- Approval note (optional) and rejection feedback (required)
- Integration with audit state machine for permission control

**Route:** `/audit/:auditId/review`

### **2. Updated Branch Manager Dashboard** ✅
**File:** `apps/web/src/screens/DashboardBranchManager.tsx`

**New Features:**
- **Pending Approval stat card** - Shows count of submitted audits
- **Pending Approval section** - Grid of audit cards waiting for review
- **Click-to-scroll** - Stat card scrolls to pending approvals section
- **Review button** - Direct navigation to review screen

### **3. App Routing** ✅
**File:** `apps/web/src/App.tsx`

**Added:**
- Route for `/audit/:auditId/review` → `AuditReviewScreen`
- Lazy loaded for code splitting

---

## 🔄 Complete Workflow

### **Step 1: Auditor Completes Audit**

1. Auditor answers all questions in `AuditWizard`
2. Auto-save keeps progress synced
3. Progress bar shows 100% completion
4. "Submit for Approval" button becomes enabled

**Code Example:**
```typescript
// In AuditWizard.tsx
const handleSubmit = async () => {
  await api.submitAuditForApproval(auditId, user.id)
  // Status changes: COMPLETED → SUBMITTED
}
```

**Status Change:** `COMPLETED` → `SUBMITTED`

---

### **Step 2: Branch Manager Sees Pending Approval**

1. Manager logs into dashboard
2. **Pending Approval stat card** shows count (e.g., "3")
3. **Pending Approval section** displays audit cards
4. Each card shows:
   - Audit ID
   - Branch name
   - Submitted date
   - Submitted by (auditor name)
   - Status badge (SUBMITTED)
   - **"Review Audit →"** button

**Visual:**
```
┌─────────────────────────────────────┐
│ Pending Approval                     │
│ 3 audits waiting for your review    │
│                                      │
│ ┌─────────┐  ┌─────────┐  ┌───────┐│
│ │ Audit 1 │  │ Audit 2 │  │ Audit │││
│ │ Branch A│  │ Branch B│  │ Branc │││
│ │         │  │         │  │       │││
│ │ Review →│  │ Review →│  │Review │││
│ └─────────┘  └─────────┘  └───────┘│
└─────────────────────────────────────┘
```

---

### **Step 3: Manager Reviews Audit**

1. Manager clicks **"Review Audit"**
2. Navigates to `/audit/:auditId/review`
3. Review screen shows:
   - **Audit metadata** (submitted by, date, completion %)
   - **All sections** with questions and answers (read-only)
   - **Status banner** from state machine
   - **Action buttons:** Approve / Reject

**Permissions (from State Machine):**
```typescript
// For BRANCH_MANAGER + SUBMITTED status:
{
  canViewOnly: true,
  canEdit: false,
  nextAction: 'Review this audit and approve or reject',
  statusLabel: 'Submitted for Review'
}
```

---

### **Step 4a: Manager Approves Audit**

1. Manager clicks **"Approve Audit"**
2. Modal appears asking for optional approval note
3. Manager writes note (optional): "Great work!"
4. Clicks **"Confirm Approval"**
5. API call:
   ```typescript
   await api.setAuditApproval(auditId, {
     status: 'approved',
     note: 'Great work!',
     userId: manager.id
   })
   ```
6. **Status changes:** `SUBMITTED` → `APPROVED`
7. Manager redirected to dashboard
8. Audit removed from "Pending Approval" section

**Database Updates:**
- `status = APPROVED`
- `approvedBy = manager.id`
- `approvedAt = now()`
- `approvalNote = "Great work!"`

---

### **Step 4b: Manager Rejects Audit**

1. Manager clicks **"Reject Audit"**
2. Modal appears requiring rejection feedback
3. Manager writes feedback: "Please recheck question 5 - answer is incomplete"
4. Clicks **"Confirm Rejection"**
5. API call:
   ```typescript
   await api.setAuditApproval(auditId, {
     status: 'rejected',
     note: 'Please recheck question 5 - answer is incomplete',
     userId: manager.id
   })
   ```
6. **Status changes:** `SUBMITTED` → `REJECTED`
7. Audit returns to auditor for corrections

**Database Updates:**
- `status = REJECTED`
- `rejectedBy = manager.id`
- `rejectedAt = now()`
- `rejectionNote = "Please recheck question 5 - answer is incomplete"`

---

### **Step 5: Auditor Fixes Rejected Audit**

1. Auditor sees audit with status **"Rejected - Needs Revision"**
2. State machine allows editing again:
   ```typescript
   {
     canEdit: true,
     canSubmit: true, // (if 100% complete)
     showWarning: 'This audit was rejected...',
     warningType: 'warning',
     nextAction: 'Revise and resubmit'
   }
   ```
3. Auditor reviews rejection feedback
4. Makes corrections
5. Resubmits for approval
6. **Status changes:** `REJECTED` → `SUBMITTED` (again)
7. Manager reviews again (back to Step 3)

---

## 🎨 UI Components Used

### **Audit Review Screen Components**

```typescript
import { AuditStatusBanner } from '../components/AuditStatusBanner'
import { useAuditStateMachine } from '../hooks/useAuditStateMachine'
import { useAuditProgress } from '../hooks/useAuditProgress'

// Permission control
const permissions = useAuditStateMachine(audit.status, user.role, progress.completionPercent)

// Visual feedback
<AuditStatusBanner 
  permissions={permissions} 
  completionPercent={progress.completionPercent}
/>

// Action buttons (only show if SUBMITTED)
{audit.status === AuditStatus.SUBMITTED && (
  <div>
    <button onClick={handleApprove}>Approve</button>
    <button onClick={handleReject}>Reject</button>
  </div>
)}
```

---

## 🔐 Permission Matrix

| Status      | Auditor        | Branch Manager | Admin         |
|-------------|----------------|----------------|---------------|
| DRAFT       | ✅ Edit/Delete | 👁️ View only   | ✅ Edit/Delete |
| IN_PROGRESS | ✅ Edit/Submit | 👁️ View only   | ✅ Edit       |
| COMPLETED   | ✅ Edit/Submit | 👁️ View only   | ✅ Edit       |
| SUBMITTED   | ❌ View only   | ✅ Approve/Reject | ✅ Override |
| REJECTED    | ✅ Edit/Resubmit | 👁️ View only | ✅ Edit       |
| APPROVED    | ❌ View only   | 👁️ View only   | ✅ Reopen    |
| FINALIZED   | ❌ View only   | ❌ View only   | ✅ Reopen    |

---

## 🧪 Testing the Workflow

### **Test Case 1: Happy Path (Approval)**

1. Login as **Auditor**
2. Complete an audit (100%)
3. Submit for approval
4. Logout
5. Login as **Branch Manager**
6. See audit in "Pending Approval"
7. Click "Review Audit"
8. Review answers
9. Click "Approve Audit"
10. Add note: "Excellent work"
11. Confirm approval
12. Verify audit disappears from pending
13. Logout
14. Login as **Auditor**
15. Verify audit shows status "Approved"

### **Test Case 2: Rejection & Resubmit**

1. Login as **Auditor**
2. Complete an audit (100%)
3. Submit for approval
4. Logout
5. Login as **Branch Manager**
6. Review audit
7. Click "Reject Audit"
8. Add feedback: "Please clarify answer to Q5"
9. Confirm rejection
10. Logout
11. Login as **Auditor**
12. See audit with "Rejected" status
13. Read rejection feedback
14. Edit answer to Q5
15. Resubmit
16. Logout
17. Login as **Branch Manager**
18. See resubmitted audit in pending
19. Review and approve

---

## 📊 API Methods Reference

### **Submit Audit**
```typescript
api.submitAuditForApproval(auditId: string, submittedBy: string): Promise<Audit>
```

**Validation:**
- Only assignee or admin can submit
- Must be in `IN_PROGRESS` or `COMPLETED` status
- Changes status to `SUBMITTED`

### **Approve/Reject Audit**
```typescript
api.setAuditApproval(auditId: string, payload: {
  status: 'approved' | 'rejected',
  note?: string,
  userId: string,
  signatureUrl?: string,
  signatureType?: 'image' | 'typed' | 'drawn',
  approvalName?: string
}): Promise<Audit>
```

**Validation:**
- Audit must be in `SUBMITTED` status
- User must have approval authority for the branch
- Rejection requires a note
- Approval note is optional

---

## 🚀 Next Steps / Enhancements

### **Notifications (Future)**
- Email notification when audit is approved/rejected
- In-app notification badge
- Push notifications for mobile app

### **Signature Support (Already Built)**
- Manager can add signature to approval
- Support for drawn, typed, or uploaded signature
- Already implemented in API, just needs UI

### **Approval History**
- Show approval/rejection history
- Track who approved/rejected and when
- Show revision history for rejected audits

### **Bulk Actions**
- Approve multiple audits at once
- Export approved audits to PDF
- Batch email approvals to stakeholders

---

## 🐛 Troubleshooting

### **"Audit must be in submitted state to approve/reject"**
**Cause:** Trying to approve an audit that's not in `SUBMITTED` status  
**Solution:** Ensure audit was properly submitted first

### **"Permission denied"**
**Cause:** Manager not assigned to the audit's branch  
**Solution:** Verify branch manager assignments in admin panel

### **Pending approvals not showing**
**Cause:** Filter may be incorrect  
**Solution:** Check `managedBranchIds` includes the audit's branch

---

## ✅ Checklist: Implementation Complete

✅ API methods exist (`submitAuditForApproval`, `setAuditApproval`)  
✅ Audit review screen created  
✅ Dashboard shows pending approvals  
✅ Route added to App.tsx  
✅ State machine handles all statuses  
✅ Approval/rejection modals functional  
✅ Navigation working (dashboard → review → dashboard)  
✅ Permission control via state machine  
✅ Visual feedback with status banners  

---

## 🎉 You're Ready!

The complete approval workflow is now functional. Branch managers can review and approve/reject audits submitted by auditors. The workflow includes:

- ✅ Visual dashboard with pending approvals
- ✅ Comprehensive review screen
- ✅ Approval/rejection with notes
- ✅ State machine permission control
- ✅ Status tracking and feedback

Test it out with your team and enjoy streamlined audit approvals! 🚀

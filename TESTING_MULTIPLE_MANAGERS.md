# 🧪 Testing Multiple Branch Manager System

## Test Plan

### Prerequisites
- Dev server running on http://localhost:3002
- Mock backend enabled (VITE_BACKEND=mock)
- Test users available (Admin, Branch Manager, Auditor)

### Test Scenarios

#### 1. **Test Branch Manager Assignment UI**
1. Login as Admin
2. Navigate to "Manage Branches" 
3. Click "Manage Managers" button on any branch
4. Verify modal opens with BranchManagerAssignments component
5. Test assigning multiple managers to a branch
6. Test removing managers from a branch
7. Verify UI updates correctly

#### 2. **Test Branch Manager Dashboard**
1. Login as Branch Manager
2. Navigate to Branch Manager Dashboard
3. Verify dashboard shows audits from assigned branches only
4. Check that `getBranchesForManager()` API is being called
5. Verify audit counts and statistics are correct

#### 3. **Test Approval Authority Logic**
1. Create a test audit in SUBMITTED status
2. Login as assigned Branch Manager
3. Verify manager can approve the audit
4. Test approval with signature/note
5. Check audit trail includes approval authority context

#### 4. **Test Admin Fallback Logic**
1. Create a branch with NO assigned managers
2. Create an audit for that branch in SUBMITTED status
3. Login as Admin
4. Verify admin can approve the audit (fallback authority)
5. Check approval context shows "admin_fallback"

#### 5. **Test Review Locking**
1. Login as Manager 1, start reviewing an audit
2. In another browser/tab, login as Manager 2
3. Try to review the same audit
4. Verify lock prevents simultaneous review
5. Test lock expiration (15 minutes)

#### 6. **Test Edge Cases**
1. **Manager Assignment During Review**: Assign/remove manager while audit is being reviewed
2. **Multiple Managers**: Verify any assigned manager can approve
3. **Super Admin Override**: Test super admin can always approve
4. **Audit Trail**: Verify all approval context is properly recorded

### Expected API Calls

#### New API Methods to Test:
- `getBranchManagerAssignments(branchId?)`
- `assignBranchManager(branchId, managerId, assignedBy)`
- `unassignBranchManager(branchId, managerId, unassignedBy)`
- `getBranchesForManager(managerId)`
- `getManagersForBranch(branchId)`
- `getApprovalAuthority(branchId, userId)`
- `createReviewLock(auditId, userId)`
- `getActiveReviewLock(auditId)`
- `releaseReviewLock(auditId, userId)`

#### Enhanced Approval Logic:
- `setAuditApproval()` now includes authority validation
- Audit records include approval context and authority type
- Review locks prevent conflicts

### Test Data Verification

#### Check Mock Data:
- `mockBranchManagerAssignments` has initial assignments
- `mockReviewLocks` starts empty
- Approval authority logic works correctly
- Audit trail fields are populated

### Success Criteria

✅ **UI Components Work**
- BranchManagerAssignments component renders correctly
- Modal opens/closes properly
- Assignment/unassignment works
- Error handling displays properly

✅ **API Integration Works**
- All new API methods return expected data
- Branch Manager Dashboard uses new assignment system
- Admin Dashboard identifies unassigned branches

✅ **Approval Logic Works**
- Assigned managers can approve audits
- Admins can approve unassigned branch audits
- Super admins can always approve
- Review locks prevent conflicts

✅ **Audit Trail Works**
- Approval authority is recorded
- Approval context is meaningful
- Manager assignments at approval time are captured

✅ **Edge Cases Handled**
- Assignment timing doesn't break workflow
- Multiple managers work correctly
- Fallback logic activates properly

## Manual Testing Steps

### Step 1: Test UI Components
```
1. Open http://localhost:3002
2. Login as Admin (use role button)
3. Go to Manage Branches
4. Click "Manage Managers" on Downtown Store
5. Verify modal opens
6. Try assigning Jane Manager to the branch
7. Verify assignment appears in list
8. Try removing the assignment
9. Verify assignment is removed
```

### Step 2: Test Dashboard Integration
```
1. Login as Branch Manager (Jane Manager)
2. Go to Branch Manager Dashboard
3. Check browser Network tab for API calls
4. Verify getBranchesForManager is called
5. Verify only assigned branch audits show
```

### Step 3: Test Approval Authority
```
1. Login as Auditor
2. Create/submit an audit for Downtown Store
3. Login as Jane Manager (assigned to Downtown Store)
4. Try to approve the audit
5. Verify approval works with proper context
6. Check audit record for approval authority fields
```

### Step 4: Test Admin Fallback
```
1. Create a branch with no assigned managers
2. Create/submit an audit for that branch
3. Login as Admin
4. Verify admin can approve the audit
5. Check approval context shows "admin_fallback"
```

This comprehensive testing will verify that the multiple branch manager system is working correctly across all scenarios.

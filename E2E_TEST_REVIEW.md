# E2E Test Review - Coverage Analysis

**Date:** 2025-10-06  
**Context:** After implementing user management APIs and empty state UX improvements

---

## **Current Test Status**

### **Existing Tests:**

| Test File | Status | Coverage |
|-----------|--------|----------|
| auth.spec.ts | ⏭️ SKIPPED | Admin/Auditor/BM login flows |
| auth.magiclink.spec.ts | ❓ Unknown | Magic link authentication |
| profile.spec.ts | ⏭️ SKIPPED | Profile update functionality |
| branches.crud.spec.ts | ⏭️ SKIPPED | Branch management CRUD |
| surveys.crud.spec.ts | ⏭️ SKIPPED | Survey template CRUD |
| zones.crud.spec.ts | ❓ Unknown | Zone management CRUD |
| auditor.flow.spec.ts | ⏭️ SKIPPED | Full auditor workflow |
| multiple-branch-managers.spec.ts | ⏭️ SKIPPED | Multi-manager features |

---

## **Recent Changes Requiring Tests**

### **1. User Management (NEW - NO TESTS)** ❌

**Implemented:**
- ✅ `api.inviteUser(email, name, role)`
- ✅ `api.deleteUser(userId)`
- ✅ `api.resendInvitation(userId)`
- ✅ ManageUsers.tsx UI
- ✅ Edge Function deployment ready

**Missing Tests:**
- ❌ Invite user flow
- ❌ Delete user flow
- ❌ Resend invitation flow
- ❌ Admin-only access validation
- ❌ Email validation
- ❌ Duplicate email handling

**Priority:** 🔴 **HIGH** - Core new feature with no coverage

---

### **2. Empty State UX Improvements (NEW - NO TESTS)** ⚠️

**Implemented:**
- ✅ DashboardAdmin empty state for "This Week's Audits"
- ✅ Context-aware messaging (week vs all, filters active)
- ✅ Smart CTA buttons (View All Audits, Create Survey)

**Missing Tests:**
- ⚠️ Empty state displays correctly
- ⚠️ CTA buttons work
- ⚠️ Toggle between week/all views

**Priority:** 🟡 **MEDIUM** - UX improvement, less critical than core features

---

## **Test Infrastructure Issues**

### **Problem: Most Tests Skipped** ⚠️

**Reason:** "Auth tests unreliable due to Supabase password setup issues"

**Impact:**
- 6 of 8 test files are completely skipped
- No regression detection for most features
- CI/CD cannot catch breaking changes

**Root Cause:**
- Tests use `loginWithCredentials()` with email/password
- Seeded users don't have passwords set
- set-passwords Edge Function is disabled (403 error)

**Solutions:**
1. ✅ **Use role-based login buttons** (already implemented in app)
2. ✅ **Use magic link auth** (auth.magiclink.spec.ts pattern)
3. ⚠️ **Set passwords in Supabase Auth dashboard** (manual step)

---

## **Coverage Gaps Analysis**

### **✅ Good Coverage:**
- Multiple branch manager system (API methods)
- Auth flows (when not skipped)
- Profile interactions

### **❌ Missing Coverage:**

#### **Critical:**
1. **User Management** - NO TESTS
   - Invite user
   - Delete user  
   - Resend invitation
   - Admin permission checks

2. **Settings Screen** - NO TESTS
   - Organization settings
   - SMTP configuration
   - User preferences

3. **Notifications** - NO TESTS
   - Create/read/delete notifications
   - Mark as read
   - Notification preferences

#### **Important:**
1. **Empty States** - NO TESTS
   - Dashboard empty states
   - List empty states
   - Search no results

2. **Error Handling** - NO TESTS
   - API errors displayed
   - Network failures
   - Validation errors

3. **Audit Approval Flow** - LIMITED TESTS
   - Branch manager review
   - Approval/rejection
   - Signature capture

---

## **Recommended Test Priorities**

### **🔴 Priority 1: User Management Tests** (30 min)

Create: `apps/web/tests/users.crud.spec.ts`

```typescript
test.describe('User Management', () => {
  test('admin can invite a new user', async ({ page }) => {
    // Login as admin
    // Navigate to Manage Users
    // Click Invite User
    // Fill form (email, name, role)
    // Submit
    // Verify user appears in list
  })
  
  test('admin can delete a user', async ({ page }) => {
    // Create user first
    // Click delete button
    // Confirm deletion
    // Verify user removed from list
  })
  
  test('admin can resend invitation', async ({ page }) => {
    // Create user first
    // Click resend button
    // Verify success toast
  })
  
  test('non-admin cannot access user management', async ({ page }) => {
    // Login as auditor
    // Try to navigate to /manage/users
    // Verify redirected to dashboard
  })
})
```

---

### **🟡 Priority 2: Fix Skipped Tests** (1 hour)

**Update all skipped tests to use role button login:**

```typescript
// OLD (doesn't work):
await loginWithCredentials(page, 'admin@trakr.com')

// NEW (works):
await page.goto('/login')
await page.getByRole('button', { name: /Login as Admin/i }).click()
await expect(page.getByRole('heading', { name: /Admin Dashboard/i })).toBeVisible()
```

**Files to update:**
- ✅ auth.spec.ts
- ✅ profile.spec.ts  
- ✅ branches.crud.spec.ts
- ✅ auditor.flow.spec.ts
- ✅ multiple-branch-managers.spec.ts

---

### **🟢 Priority 3: Empty State Tests** (20 min)

Add to existing test files:

```typescript
test('dashboard shows empty state when no audits this week', async ({ page }) => {
  // Login as admin
  // Verify "This Week" view
  // Check for empty state message
  // Verify "View All Audits" button
})
```

---

### **🔵 Priority 4: Additional Coverage** (2 hours)

1. Settings screen tests
2. Notification tests
3. Error handling tests
4. Audit approval flow tests

---

## **Test Execution Strategy**

### **Current State (from memories):**
- ✅ 11 tests passing (when not skipped)
- ✅ 0 tests failing
- ⏭️ Most tests skipped due to auth issues

### **Target State:**
- 🎯 20+ tests passing
- 🎯 0 tests failing
- 🎯 All critical features covered
- 🎯 No skipped tests (except environment-dependent)

---

## **Implementation Plan**

### **Phase 1: User Management Tests** (Now)
**Time:** 30 minutes  
**Impact:** HIGH - Tests new critical feature  
**Action:** Create `users.crud.spec.ts`

### **Phase 2: Fix Skipped Tests** (Next)
**Time:** 1 hour  
**Impact:** HIGH - Enables CI/CD regression detection  
**Action:** Update all tests to use role button login

### **Phase 3: Empty State Tests** (Later)
**Time:** 20 minutes  
**Impact:** MEDIUM - Verifies UX improvements  
**Action:** Add tests to existing files

### **Phase 4: Additional Coverage** (Future)
**Time:** 2 hours  
**Impact:** MEDIUM - Comprehensive coverage  
**Action:** New test files for settings, notifications, etc.

---

## **Recommended Action**

**Start with:** Create `users.crud.spec.ts` to test the new user management feature.

This is the highest priority because:
1. ✅ Tests brand new functionality
2. ✅ No existing coverage
3. ✅ Critical feature for production
4. ✅ Quick to implement (30 minutes)

**Next:** Fix skipped tests to enable CI/CD protection.

---

## **Test Template for User Management**

See: `apps/web/tests/users.crud.spec.ts` (to be created)

This will test:
- ✅ Invite user (happy path)
- ✅ Invite user (duplicate email error)
- ✅ Delete user
- ✅ Resend invitation
- ✅ Admin-only access
- ✅ Form validation

---

## **Success Criteria**

**After completing Phase 1 & 2:**
- [ ] 15+ tests passing
- [ ] User management fully tested
- [ ] No skipped tests (except environment-dependent)
- [ ] CI/CD can catch regressions
- [ ] All new features have test coverage

---

**Ready to implement? Start with `users.crud.spec.ts`!**

# E2E Tests - Production Setup Required

## ⚠️ Important: Password Setup Required

The E2E tests now use **real email/password authentication** for production readiness. Before running E2E tests, you **MUST** set passwords for the test accounts in Supabase.

---

## 🔧 Setup Instructions

### 1. Set Passwords in Supabase Auth Dashboard

Go to your Supabase project → Authentication → Users, and set passwords for:

| Email | Password | Role |
|-------|----------|------|
| `admin@trakr.com` | `Password123!` | Admin |
| `auditor@trakr.com` | `Password123!` | Auditor |
| `branchmanager@trakr.com` | `Password123!` | Branch Manager |

**Steps:**
1. Open Supabase Dashboard → Authentication → Users
2. Find each user
3. Click the user → "Reset Password"
4. Set password to `Password123!`
5. Confirm

---

## 🧪 E2E Test Changes

### Updated Authentication Method

**Before (Development):**
```typescript
// Used role-based login buttons (dev only)
const adminBtn = page.getByRole('button', { name: /Login as Admin/i })
await adminBtn.click()
```

**After (Production Ready):**
```typescript
// Use real email/password authentication
await page.fill('input[type="email"]', 'admin@trakr.com')
await page.fill('input[type="password"]', 'Password123!')
await page.click('button[type="submit"]')
```

---

## 📋 Updated Test Files

All test files now use email/password authentication:

- ✅ `auth.spec.ts` - Authentication smoke tests
- ✅ `branches.crud.spec.ts` - Branch management tests
- ✅ `profile.spec.ts` - Profile update tests
- ✅ `users.crud.spec.ts` - User management tests

---

## 🚀 Running E2E Tests

### Prerequisites
1. ✅ Dev server running on `http://localhost:3002`
2. ✅ Passwords set in Supabase for all test accounts
3. ✅ Supabase project environment variables configured

### Run Tests
```bash
cd apps/web
npm run e2e
```

### Run Specific Test File
```bash
npx playwright test tests/auth.spec.ts
```

### Run in UI Mode (Interactive)
```bash
npx playwright test --ui
```

---

## 🔐 Security Notes

### Development
- Test accounts use simple passwords (`Password123!`)
- This is acceptable for development/testing environments
- **DO NOT** use these passwords in production

### Production
- Use strong, unique passwords for all accounts
- Enable 2FA/MFA where applicable
- Rotate passwords regularly
- Use environment variables for sensitive data

---

## ❌ What Was Removed

**Role-Based Login Buttons (Development Only):**
```typescript
// These are NO LONGER in the codebase
<button>Login as Admin</button>
<button>Login as Auditor</button>
<button>Login as Branch Manager</button>
```

These were development helpers that bypassed authentication. They've been removed for production readiness.

---

## 🐛 Troubleshooting

### Test Failure: "Invalid login credentials"

**Cause:** Passwords not set in Supabase

**Solution:**
1. Go to Supabase Dashboard → Authentication → Users
2. Set passwords for `admin@trakr.com`, `auditor@trakr.com`, `branchmanager@trakr.com`
3. Use password: `Password123!`

### Test Failure: "Button not found"

**Cause:** Tests looking for old role-based login buttons

**Solution:**
- ✅ Already fixed! Tests now use email/password inputs
- If you see this, make sure you've pulled latest changes

### Dev Server Not Running

**Solution:**
```bash
cd apps/web
npm run dev
```

Tests expect server at `http://localhost:3002`

---

## 📊 Test Coverage

**Current E2E Test Status:**
- 19 test scenarios
- 5 test files
- Coverage includes:
  - ✅ Authentication flows
  - ✅ Admin dashboard
  - ✅ Branch management
  - ✅ User management  
  - ✅ Profile updates
  - ✅ Role-based access control

---

## ✅ Production Checklist

Before deploying to production:

- [ ] All E2E tests passing locally
- [ ] Passwords set for all test accounts in Supabase
- [ ] Environment variables configured
- [ ] No role-based login buttons in code
- [ ] Real authentication used in tests
- [ ] RLS policies tested and verified
- [ ] Error handling tested
- [ ] Mobile responsiveness tested

---

## 📝 Future Improvements

1. **Environment-Specific Test Accounts**
   - Separate test accounts for staging/production
   - Automated test data seeding

2. **CI/CD Integration**
   - Run E2E tests in GitHub Actions
   - Automated password setup in test environments

3. **Test Data Management**
   - Automated cleanup after tests
   - Isolated test database

4. **Enhanced Security**
   - Use test-specific API keys
   - Implement test user rotation

---

## 🎉 Summary

E2E tests are now **production-ready** with:
- ✅ Real email/password authentication
- ✅ No development-only shortcuts
- ✅ Proper security practices
- ✅ Comprehensive test coverage

**Just remember to set those passwords in Supabase before running tests!** 🔑

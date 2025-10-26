# E2E Test Setup & RLS Validation

## Overview

Comprehensive end-to-end tests to validate the new RLS (Row Level Security) system and ensure all user roles work correctly in production.

## Test Structure

### 📁 Test Files

**Core Tests:**
- `auth.spec.ts` - Authentication for all roles (admin, auditor, branch manager)
- `rls.access-control.spec.ts` - **NEW** - Comprehensive RLS validation
- `users.crud.spec.ts` - User management with RLS
- `branches.crud.spec.ts` - Branch management with RLS
- `surveys.crud.spec.ts` - Survey management with RLS

**Helper Functions:**
- `tests/helpers/auth.ts` - Login helpers with onboarding handling

## RLS Access Control Tests

### Test Coverage

#### ✅ Admin Role Tests
- [x] Admin sees only their organization
- [x] Admin can view all users in their org
- [x] Admin can create and manage branches
- [x] Admin can create and manage surveys
- [x] Admin can view all audits in their org

#### ✅ Auditor Role Tests  
- [x] Auditor sees only assigned branches
- [x] Auditor cannot access branch management
- [x] Auditor cannot access survey templates
- [x] Auditor sees only their own audits
- [x] Auditor blocked from user management

#### ✅ Branch Manager Role Tests
- [x] Branch manager can view org data (read-only)
- [x] Branch manager cannot create users
- [x] Branch manager cannot create branches
- [x] Branch manager sees only audits for managed branches

#### ✅ RLS Validation Tests
- [x] Admin passes RLS validation
- [x] User has proper auth_user_id mapping
- [x] No "User profile not found" errors

## Running Tests

### Prerequisites

1. **Dev server must be running:**
   ```bash
   # In terminal 1
   cd apps/web
   npm run dev
   ```

2. **Supabase must be accessible:**
   - RLS migrations applied
   - Test users seeded
   - Auth users created

### Run All Tests

```bash
# In terminal 2
cd apps/web
npm run e2e
```

### Run Specific Test Suite

```bash
# RLS access control tests
npx playwright test rls.access-control.spec.ts

# Auth tests
npx playwright test auth.spec.ts

# User CRUD tests
npx playwright test users.crud.spec.ts
```

### Run in UI Mode (Interactive)

```bash
npm run e2e:ui
```

### Run Specific Test

```bash
npx playwright test -g "admin can see only their organization"
```

## Test Users

### Required Users in Supabase

Make sure these users exist in both `auth.users` AND `public.users`:

```sql
-- Admin (SUPER_ADMIN or ADMIN)
email: admin@trakr.com
password: Password@123
role: SUPER_ADMIN or ADMIN
org_id: <valid-org-id>
auth_user_id: <must-be-set>

-- Branch Manager
email: branchmanager@trakr.com  
password: Password@123
role: BRANCH_MANAGER
org_id: <valid-org-id>
auth_user_id: <must-be-set>

-- Auditor
email: auditor@trakr.com
password: Password@123
role: AUDITOR
org_id: <valid-org-id>
auth_user_id: <must-be-set>
```

### Verify User Setup

```sql
-- Check all test users
SELECT 
  email,
  role,
  org_id IS NOT NULL as has_org,
  auth_user_id IS NOT NULL as has_auth_mapping
FROM public.users
WHERE email IN ('admin@trakr.com', 'branchmanager@trakr.com', 'auditor@trakr.com')
ORDER BY role;

-- Should return 3 rows, all with has_org=true and has_auth_mapping=true
```

## Test Configuration

### Playwright Config (`playwright.config.ts`)

```typescript
{
  testDir: './tests',
  timeout: 60_000,  // 60 seconds per test
  expect: { timeout: 10_000 },  // 10 seconds for assertions
  use: {
    baseURL: 'http://localhost:3002',  // Dev server URL
    headless: true,  // Run in headless mode (CI)
    trace: 'on-first-retry',  // Capture trace on retry
    video: 'retain-on-failure',  // Save video on failure
    screenshot: 'only-on-failure',  // Save screenshot on failure
  }
}
```

### Environment Variables

```bash
# .env.local (for local testing)
VITE_BACKEND=supabase
VITE_SUPABASE_URL=https://prxvzfrjpzoguwqbpchj.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>

# BASE_URL for tests (optional, defaults to localhost:3002)
BASE_URL=http://localhost:3002
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      
      # Seed database
      - run: node scripts/seed-with-credentials.js
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
      
      # Run dev server in background
      - run: npm run dev &
        working-directory: apps/web
        env:
          VITE_BACKEND: supabase
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      
      # Wait for dev server
      - run: sleep 10
      
      # Run E2E tests
      - run: npm run e2e
        working-directory: apps/web
      
      # Upload artifacts on failure
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: test-results
          path: apps/web/test-results/
```

## Debugging Failed Tests

### 1. View Test Reports

```bash
npx playwright show-report
```

### 2. View Screenshots

Screenshots are saved to `test-results/` on failure:
```
test-results/
  auth-spec-admin-can-sign-in/
    test-failed-1.png
```

### 3. View Videos

Videos are saved to `test-results/` on failure:
```
test-results/
  auth-spec-admin-can-sign-in/
    video.webm
```

### 4. View Traces

```bash
npx playwright show-trace test-results/.../trace.zip
```

### 5. Run in Debug Mode

```bash
# Step through test in debugger
npx playwright test --debug

# Or specific test
npx playwright test auth.spec.ts --debug
```

## Common Issues & Solutions

### Issue: Tests fail with "Timeout waiting for URL"

**Cause**: Dev server not running or slow database

**Solution**:
1. Ensure dev server is running: `npm run dev`
2. Check Supabase connection
3. Increase timeout in test: `test.setTimeout(90_000)`

### Issue: "User profile not found in database"

**Cause**: auth_user_id not linked

**Solution**:
```sql
UPDATE public.users u
SET auth_user_id = a.id
FROM auth.users a
WHERE u.email = a.email
  AND u.auth_user_id IS NULL;
```

### Issue: Tests pass locally but fail in CI

**Cause**: Database not seeded in CI

**Solution**:
1. Ensure seed script runs in CI workflow
2. Check environment variables are set
3. Verify Supabase service role key is correct

### Issue: RLS errors in console

**Cause**: Missing RLS policies or circular references

**Solution**:
1. Check all 7 RLS migrations are applied
2. Run validation: `SELECT * FROM validate_rls_for_current_user();`
3. Review RLS policies in Supabase dashboard

## Test Maintenance

### Adding New Tests

1. **Create test file** in `apps/web/tests/`
2. **Import helpers** from `./helpers/auth`
3. **Use role-based login** functions
4. **Test RLS boundaries** - verify users can't access restricted data
5. **Add to CI** - ensure test runs in GitHub Actions

### Updating for RLS Changes

When RLS policies change:

1. **Update RLS tests** in `rls.access-control.spec.ts`
2. **Verify helper functions** still work
3. **Test all roles** to ensure no regressions
4. **Update documentation** if access patterns change

## Success Criteria

### All Tests Must Pass

- [x] All authentication tests pass
- [x] All RLS access control tests pass
- [x] All CRUD tests pass for each role
- [x] No "profile not found" errors
- [x] No RLS circular reference errors
- [x] No auth mapping errors

### Local Test Run

```bash
✅ auth.spec.ts (3 tests)
✅ rls.access-control.spec.ts (15 tests)
✅ users.crud.spec.ts (X tests)
✅ branches.crud.spec.ts (X tests)
✅ surveys.crud.spec.ts (X tests)

Total: XX tests passing
```

### CI Test Run

Same as local, plus:
- Database seeded correctly
- Environment variables set
- Test artifacts uploaded on failure

## Resources

- **Playwright Docs**: https://playwright.dev
- **RLS Documentation**: `DATABASE_ACCESS_CONTROL.md`
- **RLS Migration Guide**: `RLS_REFACTOR_COMPLETE.md`
- **Auth Setup**: `AUTHENTICATION_SETUP.md`

---

**🎯 Goal**: 100% of E2E tests passing with the new RLS system

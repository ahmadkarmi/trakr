# E2E Tests - Quick Start

## ⚠️ MUST DO FIRST: Set Passwords in Supabase

E2E tests **WILL FAIL** until you set passwords for test accounts!

### 🔑 Set Passwords (2 minutes)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your Project
2. Click **Authentication** → **Users**
3. For each user, click their row → Click **...** menu → **Reset Password**

Set this password for **ALL THREE** accounts:
```
Password123!
```

**Accounts that need passwords:**
- ✅ admin@trakr.com
- ✅ auditor@trakr.com  
- ✅ branchmanager@trakr.com

---

## 🚀 Run E2E Tests

```bash
# 1. Start dev server (in one terminal)
cd apps/web
npm run dev

# 2. Run E2E tests (in another terminal)
cd apps/web
npm run e2e
```

---

## ✅ Expected Result

```
Running 19 tests using 2 workers

✓ auth smoke - admin can sign in
✓ auth smoke - admin can sign out and auditor can sign in  
✓ auth smoke - branch manager can sign in
✓ branches CRUD - all tests
✓ profile - all tests
✓ users CRUD - all tests

19 passed (Xm Xs)
```

---

## ❌ Common Errors

### "Invalid login credentials"
**Cause:** Passwords not set in Supabase  
**Fix:** Follow "Set Passwords" steps above

### "Connection refused" or "net::ERR_CONNECTION_REFUSED"
**Cause:** Dev server not running  
**Fix:** Run `npm run dev` in apps/web directory

---

## 📚 Full Documentation

See `E2E_PRODUCTION_SETUP.md` for complete details.

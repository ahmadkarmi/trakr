# 🚀 Deployment Guide - E2E Login Fixes

## ✅ Status

- ✅ **Code committed** to `fix/e2e-login-failures-router-context` branch
- ✅ **Branch pushed** to GitHub
- ✅ **E2E tests passing** (20 passed, 0 failed)
- ✅ **PR description ready** (see PR_E2E_LOGIN_FIXES.md)
- ⏳ **Ready to create PR and deploy**

---

## 📋 Step 1: Create Pull Request on GitHub

### Option A: Via GitHub Web UI (Recommended)

1. **Open GitHub PR page:**
   ```
   https://github.com/ahmadkarmi/trakr/pull/new/fix/e2e-login-failures-router-context
   ```

2. **Fill in PR details:**
   - **Title:** `Fix: E2E Login Failures - Router Context Error`
   - **Description:** Copy content from `PR_E2E_LOGIN_FIXES.md`
   - **Base branch:** `main`
   - **Compare branch:** `fix/e2e-login-failures-router-context`

3. **Add labels:**
   - `bug`
   - `e2e-tests`
   - `critical`
   - `router`

4. **Request reviewers** (if needed)

5. **Click "Create Pull Request"**

### Option B: Via GitHub CLI (if installed)

```bash
gh pr create \
  --title "Fix: E2E Login Failures - Router Context Error" \
  --body-file PR_E2E_LOGIN_FIXES.md \
  --base main \
  --head fix/e2e-login-failures-router-context \
  --label "bug,e2e-tests,critical"
```

---

## 🚀 Step 2: Deploy to Vercel

### Prerequisites

Vercel should be connected to your GitHub repository with automatic deployments enabled.

### Automatic Deployment (if configured)

1. **Push/merge triggers deployment:**
   - Pushing to `main` triggers production deployment
   - PR branches get preview deployments

2. **Check deployment status:**
   - Visit: https://vercel.com/dashboard
   - Look for latest deployment from `fix/e2e-login-failures-router-context`

### Manual Deployment via Vercel CLI

If automatic deployment isn't configured:

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy to preview:**
   ```bash
   cd apps/web
   vercel
   ```

4. **Deploy to production (after PR approved):**
   ```bash
   cd apps/web
   vercel --prod
   ```

### Manual Deployment via Vercel Dashboard

1. **Visit:** https://vercel.com/dashboard
2. **Select your project:** `trakr` or `trakr-web`
3. **Click "Deployments" tab**
4. **Click "Deploy" button**
5. **Select branch:** `fix/e2e-login-failures-router-context` or `main`
6. **Click "Deploy"**

---

## ✅ Step 3: Verify Deployment

### Production Checklist

1. **Visit production URL**
   ```
   https://your-app.vercel.app/login
   ```

2. **Verify UI elements:**
   - ✅ Login form renders
   - ✅ Email input visible
   - ✅ Password input visible
   - ✅ "Sign in" button visible
   - ❌ **NO "Quick Access" role buttons** (dev-only feature)

3. **Test email/password login:**
   - Enter: `admin@trakr.com`
   - Password: `Password@123`
   - Click "Sign in"
   - ✅ Should navigate to `/dashboard/admin`

4. **Test organization switching:**
   - Login as super admin
   - Switch organization
   - ✅ Should navigate without 404 error
   - ✅ Should load new organization data

5. **Check browser console:**
   - ❌ No React errors
   - ❌ No "useNavigate" errors
   - ❌ No 404 errors

### Development Checklist

1. **Visit preview deployment URL** (from Vercel)

2. **Verify dev features:**
   - ✅ Login form renders
   - ✅ **"Development Quick Access" section visible**
   - ✅ Three role buttons: Admin, Manager, Auditor

3. **Test role buttons:**
   - Click "Admin" button
   - ✅ Should login instantly
   - ✅ Should navigate to `/dashboard/admin`

---

## 📊 Deployment Environments

### Current Setup

| Environment | Branch | URL | Features |
|-------------|--------|-----|----------|
| **Production** | `main` | `https://trakr.vercel.app` | Email/password only |
| **Preview** | PR branches | `https://trakr-[pr-id].vercel.app` | Dev role buttons visible |
| **Local Dev** | any | `http://localhost:3002` | Dev role buttons visible |

### Environment Variables

Make sure these are set in Vercel:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_BACKEND=supabase
```

---

## 🔧 Troubleshooting

### Issue: "useNavigate" error still appears

**Solution:** Clear browser cache and hard reload
```
Windows: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

### Issue: Login page is blank

**Possible causes:**
1. React error in console (check browser DevTools)
2. Build failed (check Vercel build logs)
3. Missing environment variables

**Solution:**
1. Check Vercel build logs
2. Verify all environment variables are set
3. Test locally first: `npm run dev --workspace=apps/web`

### Issue: Role buttons visible in production

**Cause:** Environment check not working

**Solution:**
```tsx
// Verify this code in LoginScreen.tsx
{(import.meta.env.DEV || window.location.hostname === 'localhost') && (
  // Role buttons
)}
```

Make sure `import.meta.env.DEV` is `false` in production build.

### Issue: Organization switching still causes 404

**Cause:** Old code still cached

**Solution:**
1. Force rebuild in Vercel
2. Clear browser cache
3. Check `OrganizationContext.tsx` uses `navigate()` not `window.location.reload()`

---

## 🎯 Post-Deployment Tasks

### After PR Merge

- [ ] Monitor Vercel deployment logs
- [ ] Verify production deployment successful
- [ ] Test login on production URL
- [ ] Test organization switching
- [ ] Close related issues
- [ ] Update documentation if needed
- [ ] Delete feature branch (optional)

### Monitoring

1. **Check Vercel Analytics:**
   - Visit: https://vercel.com/dashboard/analytics
   - Monitor for errors
   - Check page load times

2. **Check Supabase Logs:**
   - Visit: https://app.supabase.com/project/_/logs
   - Monitor auth requests
   - Check for failed logins

3. **Run E2E tests in CI:**
   - GitHub Actions should run automatically
   - Verify all tests still pass

---

## 📞 Quick Commands

```bash
# Check current branch
git branch

# View recent commits
git log --oneline -5

# Check deployment status (if Vercel CLI installed)
vercel ls

# View Vercel logs (if Vercel CLI installed)
vercel logs

# Run E2E tests locally
npm run e2e --workspace=apps/web

# Start dev server
npm run dev --workspace=apps/web
```

---

## ✅ Success Criteria

- [x] E2E tests passing (20/20)
- [x] Code pushed to GitHub
- [ ] **PR created on GitHub**
- [ ] PR reviewed (if needed)
- [ ] PR merged to main
- [ ] **Vercel deployment successful**
- [ ] Production verified (no role buttons)
- [ ] Organization switching working
- [ ] No console errors

---

**Status:** 🟢 **READY TO CREATE PR AND DEPLOY**

**Next Steps:**
1. Create PR on GitHub using the link above
2. Wait for Vercel auto-deployment or deploy manually
3. Verify production deployment
4. Merge PR to main
5. Celebrate! 🎉

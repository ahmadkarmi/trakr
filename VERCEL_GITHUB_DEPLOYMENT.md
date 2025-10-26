# 🚀 Vercel Deployment from GitHub - Setup Guide

## Overview

This guide will help you set up automatic deployments from your GitHub repository to Vercel.

---

## ✅ Step 1: Connect GitHub Repository to Vercel

### **Option A: Via Vercel Dashboard (Recommended)**

1. **Go to Vercel Dashboard:**
   ```
   https://vercel.com/new
   ```

2. **Import Git Repository:**
   - Click **"Add New..."** → **"Project"**
   - Select **"Import Git Repository"**
   - Choose **GitHub** as provider

3. **Authorize Vercel (First Time Only):**
   - Click **"Install"** or **"Configure"**
   - Select your GitHub account: `ahmadkarmi`
   - Choose **"Only select repositories"**
   - Select: `ahmadkarmi/trakr`
   - Click **"Install"**

4. **Import the Repository:**
   - Find `ahmadkarmi/trakr` in the list
   - Click **"Import"**

---

## ⚙️ Step 2: Configure Project Settings

### **Critical Settings for Monorepo:**

| Setting | Value | Important! |
|---------|-------|------------|
| **Project Name** | `trakr` or `trakr-mobile` | Your choice |
| **Framework Preset** | Vite | Auto-detected |
| **Root Directory** | `apps/web` | ⚠️ **CRITICAL** |
| **Build Command** | `npm run build` | Default is fine |
| **Output Directory** | `dist` | Default is fine |
| **Install Command** | `npm install --include=dev` | Include dev deps |

### **Environment Variables:**

Click **"Environment Variables"** and add:

| Name | Value | Where to Get |
|------|-------|--------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key | Supabase Dashboard → Settings → API |
| `VITE_BACKEND` | `supabase` | Fixed value |
| `SENTRY_AUTH_TOKEN` | (Optional) Your Sentry token | Only if using Sentry |
| `SENTRY_ORG` | (Optional) Your Sentry org | Only if using Sentry |
| `SENTRY_PROJECT` | (Optional) Your Sentry project | Only if using Sentry |

**Apply To:** All environments (Production, Preview, Development)

---

## 🎯 Step 3: Deploy

1. **Click "Deploy"**
   - Vercel will start building immediately
   - First build takes ~3-5 minutes

2. **Monitor Build:**
   - Watch build logs in real-time
   - Look for any errors

3. **Success!**
   - You'll get a production URL like: `trakr-mobile.vercel.app`
   - Or custom domain if configured

---

## 🔄 How Auto-Deployment Works

### **Production Deployments (main branch):**

```
Push to main → GitHub webhook → Vercel builds → Deploy to production
```

**Triggers:**
- ✅ Direct push to `main`
- ✅ Merged pull request to `main`
- ✅ Commit via GitHub web UI

### **Preview Deployments (feature branches):**

```
Push to feature branch → GitHub webhook → Vercel builds → Deploy preview
```

**Features:**
- 🔗 Unique preview URL for each PR
- 💬 Automatic comment on PR with preview link
- 🔄 Updates on every push to PR branch

---

## 📋 Verify Current Status

### **Check if Connected:**

1. **Go to Vercel Dashboard:**
   ```
   https://vercel.com/dashboard
   ```

2. **Look for Project:**
   - Is `trakr` listed?
   - ✅ Yes = Connected
   - ❌ No = Need to import

3. **Check Deployments:**
   ```
   https://vercel.com/your-username/trakr/deployments
   ```
   - See recent deployments
   - Check status (Building/Ready/Error)

### **Check GitHub Integration:**

1. **Go to GitHub Settings:**
   ```
   https://github.com/ahmadkarmi/trakr/settings/installations
   ```

2. **Look for Vercel:**
   - Should see "Vercel" in installed apps
   - Should have access to `trakr` repository

---

## 🔧 Troubleshooting

### **Issue: Project Not Deploying**

**Check:**
1. Is Vercel connected to GitHub? (Check installations)
2. Is the repository imported in Vercel?
3. Are webhooks enabled? (Should be automatic)

**Solution:**
- Re-import repository from Vercel dashboard
- Or delete and re-add GitHub integration

### **Issue: Build Fails**

**Common Causes:**

| Error | Solution |
|-------|----------|
| Cannot find module | Ensure `Root Directory` = `apps/web` |
| TypeScript errors | Run `npm run build` locally first |
| Missing env vars | Add all required environment variables |
| Out of memory | Upgrade Vercel plan or reduce bundle size |

**Debug Steps:**
1. Click on failed deployment
2. Read build logs carefully
3. Fix issue locally
4. Push fix to GitHub
5. Vercel auto-rebuilds

### **Issue: Wrong Files Being Deployed**

**Problem:** Vercel is looking at repo root instead of `apps/web`

**Solution:**
1. Go to Project Settings
2. Set **Root Directory** to `apps/web`
3. Redeploy

---

## 🎨 Custom Domain (Optional)

### **Add Custom Domain:**

1. **Go to Project Settings:**
   ```
   https://vercel.com/your-username/trakr/settings/domains
   ```

2. **Add Domain:**
   - Click "Add"
   - Enter your domain (e.g., `trakr.yourdomain.com`)
   - Follow DNS configuration instructions

3. **Configure DNS:**
   - Add A record or CNAME to your DNS provider
   - Wait for propagation (5-30 minutes)

---

## 📊 Deployment Configuration Files

Your repository already has these configured:

### **1. `apps/web/vercel.json`**
```json
{
  "routes": [
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```
✅ Configured for SPA routing

### **2. `apps/web/vite.config.ts`**
✅ Build settings optimized for Vercel

### **3. Environment Variables**
⚠️ Need to be added in Vercel dashboard (not in files)

---

## 🚦 Quick Start Checklist

- [ ] Go to https://vercel.com/new
- [ ] Import `ahmadkarmi/trakr` repository
- [ ] Set Root Directory to `apps/web`
- [ ] Add environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- [ ] Click Deploy
- [ ] Wait 3-5 minutes for first build
- [ ] Test production URL
- [ ] Verify auto-deployment works (push to main)

---

## 🔗 Useful Links

| Resource | URL |
|----------|-----|
| **Vercel Dashboard** | https://vercel.com/dashboard |
| **New Project** | https://vercel.com/new |
| **GitHub Integration** | https://github.com/settings/installations |
| **Vercel Docs** | https://vercel.com/docs |
| **Deploy Button** | [Add to README] |

---

## 📝 Next Push Will Deploy

Once configured, every push to `main` will automatically:
1. Trigger Vercel webhook
2. Start new build (3-5 minutes)
3. Deploy to production
4. Update your production URL

**No manual deployment needed!** 🎉

---

## 💡 Pro Tips

### **1. Branch Protection**
- Require PR reviews before merging to main
- Ensure E2E tests pass before merge
- Test on preview deployments first

### **2. Preview Deployments**
```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and push
git push origin feature/my-feature

# Vercel automatically creates preview URL
# Comment appears on PR with link
```

### **3. Environment Variables**
- Use different values for Production vs Preview
- Sensitive keys: Use Vercel's encrypted storage
- Never commit secrets to Git

### **4. Build Performance**
```json
// Increase build speed in vercel.json
{
  "buildCommand": "npm run build",
  "framework": "vite"
}
```

---

**Ready?** Start here: https://vercel.com/new

Import `ahmadkarmi/trakr` and you'll be live in 5 minutes! 🚀

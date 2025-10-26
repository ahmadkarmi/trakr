# ⚡ Connect GitHub to Vercel - 5 Minutes

## 🎯 Goal
Set up automatic deployment from GitHub → Vercel

Every push to `main` = Automatic deployment ✨

---

## 📋 Step-by-Step

### **Step 1: Go to Vercel** (30 seconds)

Click this link:
```
https://vercel.com/new
```

Or go to: https://vercel.com/dashboard → Click "Add New..." → "Project"

---

### **Step 2: Import Repository** (1 minute)

1. **Click "Import Git Repository"**

2. **Select GitHub**

3. **Authorize Vercel** (if first time):
   - Click "Install" or "Configure"
   - Select your account: `ahmadkarmi`
   - Choose "Only select repositories"
   - Select: `ahmadkarmi/trakr`
   - Click "Install"

4. **Find and Import**:
   - Look for `ahmadkarmi/trakr`
   - Click "Import"

---

### **Step 3: Configure Project** (2 minutes)

#### **Critical Settings:**

```
Project Name: trakr
Framework: Vite (auto-detected)
Root Directory: apps/web  ⚠️ IMPORTANT!
Build Command: npm run build
Output Directory: dist
Install Command: npm install --include=dev
```

#### **Environment Variables (Click "Add" for each):**

**Required:**
```
VITE_SUPABASE_URL = [Your Supabase URL]
VITE_SUPABASE_ANON_KEY = [Your Supabase Anon Key]
VITE_BACKEND = supabase
```

**Get Supabase credentials:**
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Settings → API
4. Copy "Project URL" and "anon public" key

---

### **Step 4: Deploy!** (30 seconds)

1. Click **"Deploy"**
2. Wait 3-5 minutes
3. ✅ Done!

---

## ✅ Verify It Works

### **Check 1: Deployment Status**
```
https://vercel.com/dashboard
```
- Look for your project
- Status should be "Ready" (green checkmark)

### **Check 2: Auto-Deployment**

Test by pushing to GitHub:

```bash
# Make a small change
echo "# Test" >> README.md

# Commit and push
git add README.md
git commit -m "test: verify auto-deployment"
git push origin main
```

**Expected:**
- Vercel dashboard shows "Building..." 
- After 3-5 min → "Ready"
- New deployment appears

---

## 🎉 Success!

You now have:
- ✅ GitHub connected to Vercel
- ✅ Auto-deployment on push to main
- ✅ Preview deployments for PRs
- ✅ Production URL live

**Your production URL:**
```
https://[your-project-name].vercel.app
```

---

## 🔧 If Something Goes Wrong

### **Build Failed?**

**Check Build Logs:**
1. Go to failed deployment
2. Click "Building" tab
3. Read error message

**Common Fixes:**
- Missing `Root Directory = apps/web`
- Missing environment variables
- Wrong Supabase keys

### **Can't Find Repository?**

**Solution:**
1. Go to: https://github.com/settings/installations
2. Find "Vercel"
3. Click "Configure"
4. Ensure `trakr` is selected
5. Save

### **Wrong Files Deployed?**

**Problem:** Vercel deployed repo root instead of `apps/web`

**Fix:**
1. Vercel Dashboard → Your Project → Settings
2. Find "Root Directory"
3. Change to: `apps/web`
4. Save
5. Redeploy

---

## 📱 Next Steps

After successful deployment:

1. **Test your app:**
   - Open production URL
   - Try logging in
   - Check console for errors

2. **Set up custom domain** (optional):
   - Vercel Dashboard → Settings → Domains
   - Add your domain

3. **Monitor deployments:**
   - Every push = new deployment
   - Check dashboard for status

---

## 🚀 Quick Reference

| What | Where |
|------|-------|
| **New Project** | https://vercel.com/new |
| **Dashboard** | https://vercel.com/dashboard |
| **GitHub Integration** | https://github.com/settings/installations |
| **Deployments** | https://vercel.com/your-username/trakr/deployments |

---

**Ready?** Click here to start: https://vercel.com/new

Import `ahmadkarmi/trakr` and you're live in 5 minutes! 🎉

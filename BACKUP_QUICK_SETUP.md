# ⚡ Quick Setup: Automated Database Backups

## 🎯 5-Minute Setup

### Step 1: Get Your Supabase Database URL

1. Go to your Supabase Dashboard:
   ```
   https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]/settings/database
   ```

2. Find **Connection String** section

3. Select **URI** format

4. Copy the connection string (looks like):
   ```
   postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres
   ```

5. Replace `[YOUR-PASSWORD]` with your actual database password

### Step 2: Add Secret to GitHub

1. Go to:
   ```
   https://github.com/ahmadkarmi/trakr/settings/secrets/actions
   ```

2. Click **"New repository secret"**

3. Fill in:
   - **Name:** `SUPABASE_DB_URL`
   - **Value:** [Paste your connection string]

4. Click **"Add secret"**

### Step 3: Test the Backup

1. Go to:
   ```
   https://github.com/ahmadkarmi/trakr/actions/workflows/database-backup.yml
   ```

2. Click **"Run workflow"** dropdown

3. Click **"Run workflow"** button

4. Wait 2-3 minutes

5. ✅ Check for green checkmark

### Step 4: Verify Backup Created

1. Click on the completed workflow run

2. Scroll to **"Artifacts"** section at bottom

3. You should see: `database-backup-[number]`

4. Download it to verify (optional)

---

## ✅ You're Done!

**What happens now:**
- 🕒 Daily backups at 3 AM UTC (6 AM UAE)
- 📦 Stored for 90 days
- 🔄 Automatic schema versioning
- 🎯 Manual trigger available anytime

---

## 🚨 Need Help?

See full documentation: `DATABASE_BACKUP_SETUP.md`

**Common Issues:**

| Problem | Solution |
|---------|----------|
| Connection failed | Check password in connection string |
| Permission denied | Use postgres superuser connection |
| Secret not found | Verify secret name is exactly `SUPABASE_DB_URL` |

---

## 📅 Backup Schedule

```
┌─────────────── Daily at 3 AM UTC
│  ┌──────────── Creates full backup
│  │  ┌───────── Uploads to GitHub Artifacts
│  │  │  ┌────── Commits schema to Git
│  │  │  │
🕒 → 💾 → ☁️ → 📝
```

**Total Setup Time:** ~5 minutes ⚡

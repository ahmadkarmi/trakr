# 🚀 Backup Quick Start Guide

Get your automated backups running in 5 minutes!

---

## ✅ What's Already Protected

**Code Backups:**
- ✅ **GitHub** - Already working! Every commit is permanently saved.

**Database Backups:**
- ✅ **Supabase** - Already working! Daily backups for 7-14 days.

---

## 🎯 Setup Automated GitHub Actions Backup (Recommended!)

### Step 1: Get Your Supabase Database URL

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your Trakr project
3. Click **Settings** → **Database**
4. Scroll down to **Connection string**
5. Copy the **URI** format connection string:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres
   ```

### Step 2: Add to GitHub Secrets

1. Go to your [GitHub repository](https://github.com/ahmadkarmi/trakr)
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Enter:
   - **Name:** `SUPABASE_DB_URL`
   - **Secret:** Paste your connection string from Step 1
5. Click **Add secret**

### Step 3: Test It!

1. Go to **Actions** tab in GitHub
2. Click **Automated Database Backup** workflow
3. Click **Run workflow** button → **Run workflow**
4. Wait 2-3 minutes for completion
5. ✅ You should see a green checkmark!

### Step 4: Check Your Backup

1. Click on the completed workflow run
2. Scroll to **Artifacts** section
3. You should see `database-backup-1` (or similar)
4. ✅ Download it to verify it worked!

**Done!** Now your database is backed up daily at 3 AM UTC! 🎉

---

## 💻 Setup Local Manual Backups (Optional)

For quick backups before making changes:

### Windows:

```powershell
# 1. Add to your .env file:
SUPABASE_DB_URL=postgresql://postgres:[password]@[host]:5432/postgres

# 2. Load the environment variable:
Get-Content .env | ForEach-Object {
    if ($_ -match 'SUPABASE_DB_URL=(.+)') {
        $env:SUPABASE_DB_URL = $matches[1]
    }
}

# 3. Run the backup:
.\scripts\backup-database.ps1

# 4. Your backup is saved to:
#    database/backups/local/trakr-backup-YYYYMMDD_HHMMSS.sql.zip
```

### Linux/macOS:

```bash
# 1. Add to your .env file:
export SUPABASE_DB_URL="postgresql://postgres:[password]@[host]:5432/postgres"

# 2. Make script executable:
chmod +x scripts/backup-database.sh

# 3. Run the backup:
./scripts/backup-database.sh

# 4. Your backup is saved to:
#    database/backups/local/trakr-backup-YYYYMMDD_HHMMSS.sql.gz
```

---

## 📊 Your Complete Backup Coverage

Once set up, you'll have:

| What | Where | How Often | Retention |
|------|-------|-----------|-----------|
| **Code** | GitHub | Every push | Forever |
| **Database** | Supabase | Daily | 7-14 days |
| **Database** | GitHub Actions | Daily | 90 days |
| **Database** | Local (optional) | Manual | 30 backups |
| **Schema** | Git | On changes | Forever |

---

## 🔄 How to Restore

### From Supabase (Fastest):

1. Supabase Dashboard → Database → Backups
2. Select backup point
3. Click "Restore"

### From GitHub Actions:

1. GitHub → Actions → Find successful workflow
2. Download artifact
3. Extract the `.sql.gz` file
4. Restore:
   ```bash
   gunzip backup.sql.gz
   psql $SUPABASE_DB_URL -f backup.sql
   ```

### From Local Backup:

```powershell
# Windows
Expand-Archive backup.sql.zip -DestinationPath temp
psql $env:SUPABASE_DB_URL -f temp/backup.sql
```

---

## ⚠️ Important Notes

1. **Keep your database URL secret!** Never commit it to Git.
2. **Test restores monthly** - A backup you can't restore is useless.
3. **Before major changes** - Always create a backup first!

---

## 📚 Need More Details?

See the comprehensive guide:
- **Full Documentation:** [docs/BACKUP_STRATEGY.md](docs/BACKUP_STRATEGY.md)

---

## ✅ Checklist

**Priority 1 (Most Important!):**
- [ ] Added `SUPABASE_DB_URL` to GitHub Secrets
- [ ] Tested GitHub Actions backup workflow
- [ ] Verified backup artifact downloaded successfully

**Priority 2 (Nice to Have):**
- [ ] Set up local backup script
- [ ] Created first local backup
- [ ] Tested restore process

**Priority 3 (Future):**
- [ ] Set up AWS S3 for long-term storage
- [ ] Schedule monthly backup tests
- [ ] Document restore procedures for team

---

**You're now protected against data loss!** 🎉🔒

Questions? Check [docs/BACKUP_STRATEGY.md](docs/BACKUP_STRATEGY.md) for detailed guides.

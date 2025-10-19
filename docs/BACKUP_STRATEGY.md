# 🔒 Backup & Disaster Recovery Strategy

Comprehensive backup solution for Trakr codebase and Supabase database.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Code Backups](#code-backups)
3. [Database Backups](#database-backups)
4. [Setup Instructions](#setup-instructions)
5. [Restore Procedures](#restore-procedures)
6. [Testing Backups](#testing-backups)
7. [Best Practices](#best-practices)

---

## 🎯 Overview

### Backup Coverage

| Asset | Method | Frequency | Retention | Status |
|-------|--------|-----------|-----------|--------|
| **Code** | GitHub | On push | Permanent | ✅ Active |
| **Code** | GitHub Actions Mirror | Daily | 90 days | ⚙️ Optional |
| **Database** | Supabase Built-in | Daily | 7-14 days | ✅ Active |
| **Database** | GitHub Actions | Daily | 90 days | ⚙️ Setup Required |
| **Database** | Local Script | Manual | 30 local | ✅ Ready |
| **Schema** | Git-tracked | On changes | Permanent | ✅ Active |

---

## 💾 Code Backups

### 1. **GitHub Repository (Primary)**

**Status:** ✅ Already Active

Your code is automatically backed up to GitHub on every push:

```bash
# Every commit is permanently stored
git push origin main
```

**Benefits:**
- ✅ Automatic on every push
- ✅ Full version history
- ✅ Distributed backups (team clones)
- ✅ Free and reliable

**Protection Level:** 🟢 **Excellent** - Git history is immutable

---

### 2. **Automated Repository Mirror (Optional)**

**File:** `.github/workflows/backup-mirror.yml`

**Status:** ⚙️ Requires Setup

Mirrors your repository to a backup location daily:

```yaml
# Runs daily at 2 AM UTC
# Creates compressed archives
# Stores in GitHub Artifacts for 90 days
```

**Setup Required:**
1. (Optional) Add backup repository URL to secrets:
   - Go to GitHub → Settings → Secrets → Actions
   - Add `BACKUP_REPO_URL` (e.g., GitLab, Bitbucket URL)
   - Add `BACKUP_SSH_KEY` (SSH key for backup repo)

**Protection Level:** 🟡 **Good** - External redundancy

---

## 🗄️ Database Backups

### 1. **Supabase Built-in Backups**

**Status:** ✅ Active by Default

Supabase automatically backs up your database:

| Plan | Frequency | Retention | Access |
|------|-----------|-----------|--------|
| Free | Daily | 7 days | Dashboard |
| Pro | Daily | 7 days | Dashboard |
| Team | Daily | 14 days | Dashboard |

**To access:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Database** → **Backups**
4. Click **Restore** to restore from a backup point

**Protection Level:** 🟢 **Excellent** - Managed by Supabase

---

### 2. **Automated GitHub Actions Backup**

**File:** `.github/workflows/database-backup.yml`

**Status:** ⚙️ Requires Setup (Most Important!)

Automated daily backups with long retention:

```yaml
# Runs daily at 3 AM UTC (6 AM UAE time)
# Creates full backup + schema-only backup
# Stores in GitHub Artifacts for 90 days
# Optional: Upload to AWS S3 Glacier
```

**Setup Instructions:**

#### Step 1: Get Supabase Database URL

```bash
# In Supabase Dashboard:
# 1. Go to your project
# 2. Click Settings → Database
# 3. Scroll to "Connection string"
# 4. Copy "Connection string" (URI format)
# Format: postgresql://postgres:[password]@[host]:5432/postgres
```

#### Step 2: Add GitHub Secret

```bash
# 1. Go to GitHub → Settings → Secrets → Actions
# 2. Click "New repository secret"
# 3. Name: SUPABASE_DB_URL
# 4. Value: Your connection string from Step 1
# 5. Click "Add secret"
```

#### Step 3: Test the Workflow

```bash
# Go to GitHub → Actions
# Select "Automated Database Backup"
# Click "Run workflow" → "Run workflow"
# Wait for completion
# Check "Artifacts" for backup file
```

#### Step 4 (Optional): AWS S3 Backup

For long-term storage in AWS Glacier:

```bash
# Add these secrets to GitHub:
# - AWS_ACCESS_KEY_ID
# - AWS_SECRET_ACCESS_KEY
# - AWS_REGION (e.g., us-east-1)
# - S3_BACKUP_BUCKET (your bucket name)
```

**Benefits:**
- ✅ Daily automated backups
- ✅ 90-day retention in GitHub
- ✅ Long-term storage in AWS Glacier (optional)
- ✅ Schema tracking in Git

**Protection Level:** 🟢 **Excellent** - Multiple redundancy

---

### 3. **Local Manual Backup Scripts**

**Files:** 
- `scripts/backup-database.sh` (Linux/macOS)
- `scripts/backup-database.ps1` (Windows)

**Status:** ✅ Ready to Use

For immediate backups before major changes:

#### Windows (PowerShell):

```powershell
# Set your database URL
$env:SUPABASE_DB_URL = "postgresql://postgres:[password]@[host]:5432/postgres"

# Run backup
.\scripts\backup-database.ps1

# Backups saved to: database/backups/local/
```

#### Linux/macOS (Bash):

```bash
# Set your database URL
export SUPABASE_DB_URL="postgresql://postgres:[password]@[host]:5432/postgres"

# Make script executable
chmod +x scripts/backup-database.sh

# Run backup
./scripts/backup-database.sh

# Backups saved to: database/backups/local/
```

**Features:**
- ✅ Full database backup (compressed)
- ✅ Schema-only backup
- ✅ Automatic cleanup (keeps last 30)
- ✅ Easy restore instructions

**Protection Level:** 🟢 **Excellent** - Local control

---

## 🛠️ Setup Instructions

### Priority 1: Database Backups (Most Important!)

1. **Get Supabase Database URL:**
   ```
   Supabase Dashboard → Settings → Database → Connection string
   ```

2. **Add to GitHub Secrets:**
   ```
   GitHub → Settings → Secrets → Actions → New secret
   Name: SUPABASE_DB_URL
   Value: postgresql://postgres:[password]@[host]:5432/postgres
   ```

3. **Test Automated Backup:**
   ```
   GitHub → Actions → Automated Database Backup → Run workflow
   ```

4. **Setup Local Backup (Windows):**
   ```powershell
   # Add to your .env file:
   SUPABASE_DB_URL=postgresql://postgres:[password]@[host]:5432/postgres
   
   # Load and test:
   $env:SUPABASE_DB_URL = Get-Content .env | Where-Object { $_ -match 'SUPABASE_DB_URL' } | ForEach-Object { $_.Split('=')[1] }
   .\scripts\backup-database.ps1
   ```

### Priority 2: Code Backups (Already Working!)

Your code is already being backed up to GitHub automatically. No action needed!

---

## 🔄 Restore Procedures

### Restore Code

```bash
# From Git
git checkout <commit-hash>

# From GitHub artifact
# Download from GitHub → Actions → Workflow run → Artifacts
unzip trakr-backup-20250119.tar.gz
```

### Restore Database

#### From Supabase Built-in Backup:

```
1. Supabase Dashboard → Database → Backups
2. Select backup point
3. Click "Restore"
4. Confirm restoration
```

#### From GitHub Actions Backup:

```bash
# 1. Download artifact from GitHub Actions
# 2. Extract the .sql.gz file
gunzip trakr-db-backup-20250119_030000.sql.gz

# 3. Restore to database
psql $SUPABASE_DB_URL -f trakr-db-backup-20250119_030000.sql
```

#### From Local Backup:

```powershell
# Windows
Expand-Archive -Path database/backups/local/trakr-backup-*.sql.zip -DestinationPath temp
psql $env:SUPABASE_DB_URL -f temp/trakr-backup-*.sql
```

```bash
# Linux/macOS
gunzip -c database/backups/local/trakr-backup-*.sql.gz | psql $SUPABASE_DB_URL
```

---

## ✅ Testing Backups

**Test your backups regularly!** A backup you can't restore is useless.

### Monthly Backup Test (Recommended):

1. **Create a test database:**
   ```sql
   -- In Supabase Dashboard, create a test project
   -- Or create a local PostgreSQL instance
   ```

2. **Restore latest backup:**
   ```bash
   # Download from GitHub Actions or use local backup
   psql $TEST_DB_URL -f backup.sql
   ```

3. **Verify data:**
   ```sql
   -- Check critical tables
   SELECT COUNT(*) FROM audits;
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM branches;
   ```

4. **Document results:**
   ```
   ✅ Backup restored successfully
   ✅ All tables present
   ✅ Data integrity verified
   Date: [timestamp]
   ```

---

## 🎯 Best Practices

### For Development:

1. **Before major changes:**
   ```powershell
   # Create local backup
   .\scripts\backup-database.ps1
   ```

2. **Before schema migrations:**
   ```powershell
   # Backup + commit schema
   .\scripts\backup-database.ps1
   git add database/backups/schemas/latest-schema.sql
   git commit -m "backup: schema before migration"
   ```

### For Production:

1. **Monitor backup status:**
   - Check GitHub Actions daily
   - Verify Supabase backups weekly
   - Test restore monthly

2. **Document changes:**
   ```bash
   # Tag major releases
   git tag -a v1.0.0 -m "Production release 1.0.0"
   git push origin v1.0.0
   ```

3. **Keep multiple copies:**
   - ✅ GitHub (automatic)
   - ✅ Supabase (automatic)
   - ✅ GitHub Actions (daily)
   - ✅ Local backups (before changes)
   - ✅ AWS S3 (optional, long-term)

### Recovery Time Objectives (RTO):

| Scenario | Target Recovery Time | Method |
|----------|---------------------|--------|
| Code rollback | < 5 minutes | Git revert |
| Database restore (recent) | < 15 minutes | Supabase backup |
| Database restore (old) | < 30 minutes | GitHub Actions artifact |
| Full disaster recovery | < 2 hours | All backups + rebuild |

---

## 📊 Backup Monitoring

### Weekly Checklist:

```
□ GitHub Actions backup succeeded
□ Supabase backups present (last 7 days)
□ Local backup script tested
□ No backup errors in logs
□ Storage space available
```

### Monthly Checklist:

```
□ Test restore from backup
□ Review retention policies
□ Update documentation
□ Verify all secrets configured
□ Test disaster recovery plan
```

---

## 🚨 Disaster Recovery Plan

### Scenario 1: Accidental Data Deletion

1. **Stop all writes** to database
2. **Restore from Supabase backup** (last good state)
3. **Verify data integrity**
4. **Resume operations**

**Time:** ~15 minutes

### Scenario 2: Database Corruption

1. **Create new Supabase project**
2. **Restore from GitHub Actions backup**
3. **Update environment variables**
4. **Deploy updated config**

**Time:** ~30 minutes

### Scenario 3: Complete Loss

1. **Create new Supabase project**
2. **Clone code from GitHub**
3. **Restore database from backup**
4. **Reconfigure environment**
5. **Deploy to Vercel**
6. **Verify functionality**

**Time:** ~2 hours

---

## 💡 Quick Reference

### Important Commands:

```powershell
# Windows backup
$env:SUPABASE_DB_URL = "your-connection-string"
.\scripts\backup-database.ps1

# Manual GitHub Actions run
# GitHub → Actions → Automated Database Backup → Run workflow

# Check Supabase backups
# Supabase Dashboard → Database → Backups

# Restore from local
Expand-Archive backup.zip -DestinationPath temp
psql $env:SUPABASE_DB_URL -f temp/backup.sql
```

### Important Files:

- `.github/workflows/database-backup.yml` - Automated backups
- `.github/workflows/backup-mirror.yml` - Code mirror
- `scripts/backup-database.ps1` - Manual backup (Windows)
- `scripts/backup-database.sh` - Manual backup (Linux/macOS)
- `database/backups/local/` - Local backup storage
- `database/backups/schemas/` - Git-tracked schemas

---

## 📞 Support

If you encounter issues:

1. **Check logs:**
   - GitHub Actions → Workflow runs
   - Supabase Dashboard → Logs

2. **Verify configuration:**
   - GitHub secrets set correctly
   - Database URL is valid
   - pg_dump is installed

3. **Test manually:**
   ```powershell
   # Test connection
   psql $env:SUPABASE_DB_URL -c "SELECT version();"
   ```

---

**Last Updated:** 2025-01-19  
**Status:** ✅ Production Ready  
**Next Review:** Monthly

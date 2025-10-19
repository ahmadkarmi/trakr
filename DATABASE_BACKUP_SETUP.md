# 🗄️ Automated Database Backup Setup Guide

## Overview

Your repository has an automated database backup workflow that:
- ✅ Runs daily at 3 AM UTC (6 AM UAE time)
- ✅ Creates full database backups
- ✅ Maintains schema-only backups
- ✅ Stores backups in GitHub Artifacts (90 days)
- ✅ Manual trigger available

## 📋 Setup Checklist

### 1. Required GitHub Secrets

Add these secrets to your repository:

#### **Navigate to:**
```
https://github.com/ahmadkarmi/trakr/settings/secrets/actions
```

#### **Required Secret:**

| Secret Name | Value | Where to Find |
|-------------|-------|---------------|
| `SUPABASE_DB_URL` | `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres` | Supabase Dashboard → Settings → Database |

**To get your Supabase DB URL:**
1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/database
2. Look for **Connection String** section
3. Select **URI** format
4. Copy the full connection string
5. Replace `[YOUR-PASSWORD]` with your actual database password

**Format:**
```
postgresql://postgres.xxxxxxxxxxxxx:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres
```

---

## 🚀 How to Add Secrets

### Via GitHub Web UI:

1. **Go to Repository Settings:**
   ```
   https://github.com/ahmadkarmi/trakr/settings/secrets/actions
   ```

2. **Click "New repository secret"**

3. **Add `SUPABASE_DB_URL`:**
   - Name: `SUPABASE_DB_URL`
   - Value: Your Supabase connection string
   - Click "Add secret"

### Via GitHub CLI:

```bash
# Install GitHub CLI if not installed
winget install GitHub.cli

# Set Supabase DB URL
gh secret set SUPABASE_DB_URL

# Paste your connection string when prompted
```

---

## 📅 Backup Schedule

### Automatic Backups

The workflow runs automatically:
- **Frequency:** Daily
- **Time:** 3:00 AM UTC (6:00 AM UAE time)
- **Retention:** 90 days in GitHub Artifacts

### Manual Trigger

You can trigger a backup manually:

#### Via GitHub Web UI:
1. Go to: https://github.com/ahmadkarmi/trakr/actions/workflows/database-backup.yml
2. Click **"Run workflow"**
3. Select branch (usually `main`)
4. Click **"Run workflow"**

#### Via GitHub CLI:
```bash
gh workflow run database-backup.yml
```

---

## 📦 What Gets Backed Up

### Job 1: Full Database Backup (`backup-database`)

**Includes:**
- ✅ All tables and data
- ✅ Indexes
- ✅ Constraints
- ✅ Triggers
- ✅ Functions
- ✅ Views

**Excludes:**
- ❌ Ownership information
- ❌ Privileges/permissions

**Storage:**
- GitHub Artifacts (90 days retention)

### Job 2: Schema-Only Backup (`backup-schema-only`)

**Includes:**
- ✅ Table structures
- ✅ Indexes
- ✅ Constraints
- ✅ Functions/procedures
- ✅ Views
- ✅ Types

**Excludes:**
- ❌ Actual data (for version control)

**Storage:**
- Committed to repository: `database/backups/schemas/latest-schema.sql`
- Version controlled in Git

---

## 📥 How to Download Backups

### From GitHub Artifacts:

1. **Go to Actions:**
   ```
   https://github.com/ahmadkarmi/trakr/actions/workflows/database-backup.yml
   ```

2. **Click on a completed run**

3. **Download artifact:**
   - Look for "Artifacts" section at bottom
   - Click `database-backup-[number]` to download
   - Extract the `.sql.gz` file

---

## 🔄 How to Restore from Backup

### 1. Download the Backup

```bash
# Extract the compressed backup
gunzip trakr-db-backup-YYYYMMDD_HHMMSS.sql.gz
```

### 2. Restore to Supabase

```bash
# Set your Supabase connection string
export SUPABASE_DB_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Restore the backup
psql "${SUPABASE_DB_URL}" < trakr-db-backup-YYYYMMDD_HHMMSS.sql
```

### 3. Verify Restoration

```bash
# Connect to database
psql "${SUPABASE_DB_URL}"

# Check tables
\dt

# Check recent data
SELECT COUNT(*) FROM audits;
SELECT COUNT(*) FROM users;
```

---

## 🔍 Monitoring Backups

### Check Backup Status:

1. **Via GitHub Actions:**
   ```
   https://github.com/ahmadkarmi/trakr/actions/workflows/database-backup.yml
   ```
   - ✅ Green checkmark = Success
   - ❌ Red X = Failed
   - 🟡 Yellow dot = In progress

2. **Via Email:**
   - GitHub sends notifications for failed workflows
   - Configure: Settings → Notifications

### Check Backup Size:

```bash
# View artifact sizes in Actions UI
# Typical sizes:
# - Small DB: 1-10 MB
# - Medium DB: 10-100 MB
# - Large DB: 100 MB - 1 GB
```

---

## 🛡️ Security Best Practices

### 1. **Connection String Security**
- ✅ Stored as GitHub Secret (encrypted)
- ✅ Never committed to repository
- ✅ Not visible in logs
- ✅ Accessible only to authorized workflows

### 2. **Backup Access Control**
- ✅ GitHub Artifacts require repository access
- ✅ Automated cleanup after 90 days

### 3. **Sensitive Data**
- ⚠️ Backups contain production data
- ⚠️ Download backups securely
- ⚠️ Don't share backup files publicly

---

## 📊 Cost Estimation

### GitHub Artifacts (Free Tier)

| Item | Free Tier | Cost |
|------|-----------|------|
| Storage | 500 MB | Free |
| Retention | 90 days | Free |
| Bandwidth | Unlimited | Free |

**Total Cost:** $0 (100% Free with GitHub)

---

## 🚨 Troubleshooting

### Backup Fails with "Connection Failed"

**Problem:** Cannot connect to Supabase database

**Solution:**
1. Verify `SUPABASE_DB_URL` secret is correct
2. Check database password hasn't changed
3. Verify database is accessible (not paused)

### Backup Fails with "Permission Denied"

**Problem:** Insufficient database permissions

**Solution:**
1. Use `postgres` superuser connection string
2. Verify user has backup privileges

### Backup File is Empty

**Problem:** pg_dump produced no output

**Solution:**
1. Check connection string format
2. Verify database has tables
3. Review workflow logs for errors

---

## 📋 Quick Reference Commands

```bash
# Manually trigger backup
gh workflow run database-backup.yml

# List recent workflow runs
gh run list --workflow=database-backup.yml

# Download latest backup artifact
gh run download --name database-backup-latest

# Extract backup
gunzip trakr-db-backup-*.sql.gz

# Restore backup
psql "${SUPABASE_DB_URL}" < trakr-db-backup-*.sql
```

---

## 🔗 Related Documentation

- [Supabase Database Backup Guide](https://supabase.com/docs/guides/platform/backups)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [PostgreSQL pg_dump Documentation](https://www.postgresql.org/docs/current/app-pgdump.html)

---

## ✅ Setup Verification

Once secrets are configured, verify the setup:

1. **Manual Test Run:**
   ```bash
   gh workflow run database-backup.yml
   ```

2. **Check Workflow Status:**
   ```
   https://github.com/ahmadkarmi/trakr/actions
   ```

3. **Verify Artifacts:**
   - Look for "database-backup-[number]" artifact
   - Should contain `.sql.gz` file

4. **Download and Inspect:**
   ```bash
   gunzip -c trakr-db-backup-*.sql.gz | head -50
   ```

---

**Status:** 🟡 **Needs Configuration**  
**Next Step:** Add `SUPABASE_DB_URL` secret to GitHub repository  
**Last Updated:** 2025-01-20

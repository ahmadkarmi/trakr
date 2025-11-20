# GitHub Secrets Setup Guide

## Issue
The database backup workflows are failing because the `SUPABASE_DB_URL` secret is not configured in GitHub.

## Error Message
```
pg_dump: error: connection to server on socket "/var/run/postgresql/.s.PGSQL.5432" failed: No such file or directory
```

This happens when `SUPABASE_DB_URL` is empty, causing `pg_dump` to default to looking for a local PostgreSQL socket.

## Solution: Add SUPABASE_DB_URL Secret

### Step 1: Get Your Database Connection String

1. **Go to Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/prxvzfrjpzoguwqbpchj
   - Or navigate to: Project Settings → Database

2. **Find Connection String**
   - Scroll to **Connection string** section
   - Select **URI** tab
   - Copy the full connection string

   **Format:**
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.prxvzfrjpzoguwqbpchj.supabase.co:5432/postgres
   ```

   **Important Notes:**
   - The password is included in the URI
   - Use the **database password**, not your account password
   - If you don't see the password, you may need to reset it in Supabase

### Step 2: Add Secret to GitHub

1. **Navigate to Repository Settings**
   - Go to: https://github.com/ahmadkarmi/trakr/settings
   - Or: Repository → Settings (tab at top)

2. **Access Secrets**
   - Left sidebar → **Secrets and variables** → **Actions**

3. **Create New Secret**
   - Click **New repository secret**
   - **Name**: `SUPABASE_DB_URL`
   - **Secret**: Paste the complete connection string from Step 1
   - Click **Add secret**

### Step 3: Verify Setup

1. **Re-run Failed Workflow**
   - Go to: https://github.com/ahmadkarmi/trakr/actions
   - Find the failed "Automated Database Backup" workflow
   - Click on it
   - Click **Re-run all jobs** (top right)

2. **Expected Results**
   - ✅ `backup-database` job should succeed
   - ✅ `backup-schema-only` job should succeed
   - ✅ Artifacts should be uploaded to GitHub

## Security Best Practices

- ✅ **Never commit** database credentials to version control
- ✅ **Use GitHub Secrets** for sensitive data in workflows
- ✅ **Rotate credentials** periodically
- ✅ **Limit access** to secrets (only admins can view/edit)

## Workflow Files Using This Secret

- `.github/workflows/database-backup.yml` - Both jobs use `SUPABASE_DB_URL`

## Troubleshooting

### If Re-run Still Fails

**Check the logs for:**
1. `pg_dump: error: connection failed` - Incorrect credentials
2. `pg_dump: error: server closed the connection` - Network/firewall issue
3. `No such file or directory` - Secret still not set (cache issue - wait a few minutes)

**Solutions:**
1. Verify the connection string is correct (test it locally with `psql`)
2. Ensure no extra spaces or newlines in the secret value
3. Check Supabase project is ACTIVE (not paused)

### Testing Locally

You can test the connection string locally:
```bash
# Test connection (will prompt for password if needed)
psql "postgresql://postgres:[PASSWORD]@db.prxvzfrjpzoguwqbpchj.supabase.co:5432/postgres"

# Test backup
pg_dump "postgresql://postgres:[PASSWORD]@db.prxvzfrjpzoguwqbpchj.supabase.co:5432/postgres" --schema-only > test.sql
```

## Additional Resources

- [GitHub Actions Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Supabase Database Connection Guide](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [PostgreSQL pg_dump Documentation](https://www.postgresql.org/docs/current/app-pgdump.html)

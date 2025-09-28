# Authentication Setup Guide

## Issue: Email/Password Login Not Working

The email/password login functionality requires users to have passwords set in Supabase Auth. Currently, the seeded users exist in the database but don't have passwords configured.

## Quick Solution: Use Role Buttons

**For immediate testing and development, use the role buttons on the login page:**

- 🛠️ **Login as Admin** - Access admin dashboard
- 🏬 **Login as Branch Manager** - Access branch manager dashboard  
- 🕵️‍♂️ **Login as Auditor** - Access auditor dashboard

These buttons bypass password authentication and use the seeded user data directly.

## Setting Up Email/Password Authentication

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Authentication > Users**
3. Find the users:
   - admin@trakr.com
   - branchmanager@trakr.com  
   - auditor@trakr.com
4. Click on each user and set a password (suggested: `Password123!`)

### Option 2: Enable Edge Function (Temporary)

If you have access to enable the `set-passwords` Edge Function:

1. Enable the function in Supabase dashboard
2. Run the password reset script:
   ```bash
   cd apps/web
   SUPABASE_URL="your-url" SUPABASE_ANON_KEY="your-key" NEW_PASSWORD="Password123!" node scripts/reset-passwords.mjs
   ```
3. Disable the function again for security

### Option 3: Create New Users

You can create new users with passwords directly in Supabase Auth dashboard and ensure they have corresponding entries in the `users` table.

## Default Credentials

Once passwords are set, you can use:

- **Email**: admin@trakr.com, branchmanager@trakr.com, auditor@trakr.com
- **Password**: Password123! (or whatever you set)

## For E2E Tests

E2E tests use magic link authentication and service role access, so they don't require password setup.

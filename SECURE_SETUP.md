# 🔐 Secure Environment Setup for Trakr

This guide shows you how to securely configure Trakr to use your Supabase database without exposing credentials.

## 🛡️ Security-First Approach

**✅ What we do:**
- Use environment variables (never committed to git)
- Keep credentials in your local environment only
- Use `.env` files that are gitignored
- Separate anon keys from service keys

**❌ What we never do:**
- Hardcode credentials in source code
- Commit `.env` files to version control
- Share credentials in chat or documentation
- Use service keys in frontend code

## 🚀 Setup Instructions

### Step 1: Get Your Supabase Credentials

1. **Go to your Supabase project dashboard**
2. **Navigate to Settings → API**
3. **Copy these values** (keep them secure):
   - **Project URL**: `https://your-project-id.supabase.co`
   - **Anon key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (public, safe for frontend)
   - **Service role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (secret, admin access)

### Step 2: Create Secure Environment Files

#### For Web App Development:
Create `apps/web/.env` (this file is gitignored):
```bash
# Trakr Web App Configuration
VITE_BACKEND=supabase
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

#### For Database Seeding:
Create `.env` in project root (this file is gitignored):
```bash
# Database Seeding Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
```

### Step 3: Verify Security

**Check that `.env` files are gitignored:**
```bash
git status
# Should NOT show any .env files as untracked
```

**Verify environment variables are loaded:**
```bash
# In PowerShell
echo $env:VITE_BACKEND
# Should output: supabase
```

## 🎯 Usage Commands

### Start Web App with Supabase:
```powershell
# Navigate to project root
cd d:\Dev\Apps\Trakr

# Start development server (will use .env automatically)
npm run dev:web
```

### Seed Database Securely:
```powershell
# Navigate to project root
cd d:\Dev\Apps\Trakr

# Run seeding (will use .env automatically)
npm run seed:db
```

### Alternative: PowerShell Session Variables
If you prefer not to create `.env` files:
```powershell
# Set for current session only
$env:VITE_BACKEND="supabase"
$env:VITE_SUPABASE_URL="https://your-project-id.supabase.co"
$env:VITE_SUPABASE_ANON_KEY="your_anon_key_here"

# For seeding
$env:SUPABASE_URL="https://your-project-id.supabase.co"
$env:SUPABASE_SERVICE_KEY="your_service_role_key_here"

# Run commands
npm run dev:web
npm run seed:db
```

## 🔍 Verification Steps

### 1. Check App is Using Supabase:
- Start the web app: `npm run dev:web`
- Open browser console (F12)
- Look for: `[api] Using Supabase backend` (no fallback warnings)
- Login should show your seeded users

### 2. Check Database Connection:
- Run: `npm run seed:db`
- Should show: `✅ Connection successful`
- Should display your actual table schemas

### 3. Verify Data in App:
- Login as admin using role button
- Navigate to Analytics
- Should show real data from your seeded database
- Branch managers should see their assigned branches

## 🚨 Security Checklist

- [ ] `.env` files are NOT committed to git
- [ ] Service role key is only used for seeding (never in frontend)
- [ ] Anon key is used for frontend (has proper RLS policies)
- [ ] No credentials in source code
- [ ] Environment variables are set correctly
- [ ] App connects to Supabase (not mock data)

## 🆘 Troubleshooting

### "Missing VITE_SUPABASE_URL" Error:
- Check `.env` file exists in `apps/web/`
- Verify environment variables are set
- Restart development server

### "Using mock data" in Console:
- Set `VITE_BACKEND=supabase` in environment
- Check Supabase credentials are correct
- Verify `.env` file is in correct location

### Database Seeding Fails:
- Check service role key (not anon key) for seeding
- Verify Supabase URL is correct
- Check table schemas match expected format

## 📞 Need Help?

If you encounter issues:
1. Check the console for specific error messages
2. Verify your Supabase project is active
3. Ensure RLS policies allow your operations
4. Double-check environment variable names and values

---

**Remember: Keep your credentials secure and never commit them to version control!** 🔐

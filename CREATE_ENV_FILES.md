# Manual Environment File Setup

Since the PowerShell script had issues capturing input, let's create the files manually.

## Step 1: Create apps/web/.env

1. **Create a new file**: `apps/web/.env`
2. **Add this content** (replace with YOUR actual values):

```
VITE_BACKEND=supabase
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## Step 2: Create .env (in project root)

1. **Create a new file**: `.env` (in the root folder)
2. **Add this content** (replace with YOUR actual values):

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
```

## Step 3: Get Your Actual Credentials

### From Supabase Dashboard:
1. Go to your Supabase project
2. Settings → API
3. Copy these values:
   - **Project URL**: https://xxxxx.supabase.co
   - **anon public**: eyJhbGci... (this is VITE_SUPABASE_ANON_KEY)
   - **service_role**: eyJhbGci... (this is SUPABASE_SERVICE_KEY)

## Step 4: Quick PowerShell Commands

Or use these commands in PowerShell (replace with YOUR values):

```powershell
# Navigate to project
cd d:\Dev\Apps\Trakr

# Create web app .env
@"
VITE_BACKEND=supabase
VITE_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
"@ | Out-File -FilePath "apps\web\.env" -Encoding UTF8

# Create root .env
@"
SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
SUPABASE_SERVICE_KEY=YOUR_SERVICE_KEY_HERE
"@ | Out-File -FilePath ".env" -Encoding UTF8

# Restart dev server
npm run dev:web
```

## Step 5: Verify Files

```powershell
# Check files exist
Test-Path apps\web\.env
Test-Path .env

# View content (should NOT be empty)
Get-Content apps\web\.env
Get-Content .env
```

## Step 6: Restart Dev Server

```powershell
# Stop current server (Ctrl+C)
# Then restart:
npm run dev:web
```

## Step 7: Clear Browser Cache

- Open http://localhost:3002
- Press Ctrl + Shift + R (hard refresh)
- Or press F12, right-click refresh button → "Empty Cache and Hard Reload"

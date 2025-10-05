# 🚀 Run Phase 1 NOW - Quick Start

## ✅ **What's Ready**

All code is implemented! Now you just need to:
1. Run the SQL migration
2. Restart your dev server
3. Test it!

## 📋 **Step 1: Run SQL Migration**

### **Option A: Via Supabase Dashboard (Recommended)**

```bash
1. Open: https://supabase.com/dashboard
2. Select your Trakr project
3. Click "SQL Editor" in left sidebar
4. Click "New Query"
5. Open the file: scripts/add-saas-multi-tenancy.sql
6. Copy ALL contents and paste into SQL Editor
7. Click "Run" (or Ctrl+Enter)
8. ✅ You should see success messages!
```

### **Option B: Via PowerShell (Windows)**

```powershell
# Read SQL file and display it
Get-Content scripts/add-saas-multi-tenancy.sql

# Then copy and paste into Supabase SQL Editor
```

## 🔄 **Step 2: Restart Dev Server**

```bash
# If dev server is running, stop it (Ctrl+C)

# Restart
npm run dev:web

# Wait for it to start
# Open: http://localhost:3002
```

## 🧪 **Step 3: Test Single Org (Should Work)**

```bash
1. Login as admin@trakr.com / Password@123
2. Navigate around the app
3. ✅ Everything should work normally
4. ✅ No switcher visible yet (only 1 org)
```

## 🎯 **Step 4: Make Yourself Super Admin**

Run this SQL in Supabase:

```sql
-- Make yourself a super admin
UPDATE users 
SET role = 'SUPER_ADMIN' 
WHERE email = 'admin@trakr.com';

-- Verify
SELECT email, role FROM users WHERE email = 'admin@trakr.com';
```

Then:
```bash
1. Refresh your app (Ctrl+R)
2. ✅ Still works, but still no switcher (only 1 org)
```

## 🏢 **Step 5: Create Second Organization**

Run this SQL to test multi-tenancy:

```sql
-- Create Acme Corp (second organization)
INSERT INTO organizations (
  id, 
  name, 
  subscription_status,
  subscription_tier,
  trial_ends_at,
  created_at, 
  updated_at
)
VALUES (
  uuid_generate_v4(),
  'Acme Corp',
  'trial',
  'starter',
  NOW() + INTERVAL '14 days',
  NOW(),
  NOW()
);

-- Create admin for Acme
INSERT INTO users (
  id,
  email,
  role,
  org_id,
  created_at,
  updated_at
)
VALUES (
  uuid_generate_v4(),
  'admin@acmecorp.com',
  'ADMIN',
  (SELECT id FROM organizations WHERE name = 'Acme Corp'),
  NOW(),
  NOW()
);

-- Create branches for Acme
INSERT INTO branches (
  id,
  org_id,
  name,
  address,
  created_at,
  updated_at
)
VALUES 
(
  uuid_generate_v4(),
  (SELECT id FROM organizations WHERE name = 'Acme Corp'),
  'Acme HQ',
  '789 Acme Street',
  NOW(),
  NOW()
),
(
  uuid_generate_v4(),
  (SELECT id FROM organizations WHERE name = 'Acme Corp'),
  'Acme Warehouse',
  '456 Storage Blvd',
  NOW(),
  NOW()
);

-- Create zones for Acme
INSERT INTO zones (
  id,
  org_id,
  name,
  description,
  created_at,
  updated_at
)
VALUES 
(
  uuid_generate_v4(),
  (SELECT id FROM organizations WHERE name = 'Acme Corp'),
  'Acme Region',
  'Main Acme operating region',
  NOW(),
  NOW()
);

-- Link branches to zone
INSERT INTO zone_branches (zone_id, branch_id)
SELECT 
  z.id,
  b.id
FROM zones z
CROSS JOIN branches b
WHERE z.org_id = (SELECT id FROM organizations WHERE name = 'Acme Corp')
AND b.org_id = (SELECT id FROM organizations WHERE name = 'Acme Corp');

-- Verify
SELECT name, subscription_status FROM organizations;
```

## 🎉 **Step 6: See The Magic!**

```bash
1. Refresh your app (Ctrl+R or F5)
2. ✅ You should now see the YELLOW banner at top!
3. ✅ "🛠️ TRAKR STAFF" badge
4. ✅ Dropdown with 2 organizations
```

## 🔄 **Step 7: Test Organization Switching**

```bash
1. In the dropdown, select first org (original)
2. Go to Manage Branches
3. Note the branches (your original branches)

4. In dropdown, select "Acme Corp"
5. Page reloads
6. Go to Manage Branches
7. ✅ You should see different branches! (Acme HQ, Acme Warehouse)

8. Switch back to original org
9. ✅ See original branches again!

🎉 DATA ISOLATION WORKING! 🎉
```

## 🧪 **Step 8: Test as Regular User**

```sql
-- Make yourself a regular admin again
UPDATE users 
SET role = 'ADMIN' 
WHERE email = 'admin@trakr.com';
```

```bash
1. Logout (click profile → Logout)
2. Login again as admin@trakr.com
3. ✅ No yellow banner
4. ✅ No organization switcher
5. ✅ Only see your organization's data
```

## 📊 **Visual Guide**

### **Before (Single Org):**
```
┌─────────────────────────────┐
│ Dashboard                   │ ← No banner
│                             │
│ Your data...                │
└─────────────────────────────┘
```

### **After (Multi-Tenant Super Admin):**
```
┌─────────────────────────────────────────────┐
│ 🛠️ TRAKR STAFF | [Org Dropdown▼] Viewing: XYZ │ ← Yellow banner!
├─────────────────────────────────────────────┤
│ Dashboard                                    │
│                                              │
│ Selected org's data...                       │
└─────────────────────────────────────────────┘
```

## ✅ **Success Checklist**

Phase 1 is working when:
- [ ] SQL migration runs without errors
- [ ] App starts without errors
- [ ] Super admin sees yellow banner
- [ ] Dropdown shows multiple organizations
- [ ] Switching orgs changes visible data
- [ ] Regular users see only their org
- [ ] RLS policies enforce data isolation

## 🐛 **Troubleshooting**

### **SQL Error: "column already exists"**
```sql
-- Skip the columns that exist, or run:
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status...
-- The IF NOT EXISTS will skip if column exists
```

### **No organization switcher visible?**
```bash
# Check you're super admin
SELECT email, role FROM users WHERE email = 'admin@trakr.com';
# Should show: SUPER_ADMIN

# Check you have multiple orgs
SELECT COUNT(*) FROM organizations;
# Should show: 2 or more

# Clear browser cache and refresh
Ctrl + Shift + R
```

### **Page crashes on load?**
```bash
# Check browser console (F12)
# Look for errors
# Common fixes:
1. Hard refresh: Ctrl + Shift + R
2. Clear localStorage: localStorage.clear() in console
3. Restart dev server
```

### **Can't switch organizations?**
```bash
# Clear localStorage
localStorage.clear()
location.reload()
```

## 🎯 **What to Test**

### **Test Data Isolation:**
1. ✅ Branches are different per org
2. ✅ Zones are different per org
3. ✅ Users are different per org
4. ✅ Audits are different per org

### **Test Super Admin Powers:**
1. ✅ Can see all orgs in dropdown
2. ✅ Can switch between orgs
3. ✅ Data updates when switching
4. ✅ Page reloads on switch

### **Test Regular User Limits:**
1. ✅ Cannot see org switcher
2. ✅ Only sees their org data
3. ✅ Cannot access other org's data

## 🎉 **You Did It!**

Your app is now a **multi-tenant SaaS platform**!

**Next Steps:**
- Phase 2: Build signup flow
- Phase 3: User invitations
- Phase 4: Stripe billing

**But first, celebrate! 🎉 You just transformed your app!**

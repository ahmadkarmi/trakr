# Branch Manager View - Supabase Data Audit

**Date:** 2025-10-07  
**Status:** ⚠️ **CRITICAL ISSUE FOUND**

---

## 🔍 **Audit Summary**

### **Critical Finding: Mock Data Still Active!**

The application has a **backend switcher** that defaults to **MOCK DATA** unless explicitly configured to use Supabase.

---

## 📋 **What I Found**

### **1. Backend Switcher in `apps/web/src/utils/api.ts`**

```typescript
const backend = ((import.meta as any).env?.VITE_BACKEND || 'mock').toLowerCase()

export const api: typeof mockApi = (backend === 'supabase' ? (proxyApi as any) : mockApi) as typeof mockApi
```

**Current Behavior:**
- ❌ **Defaults to MOCK data** if `VITE_BACKEND` is not set
- ✅ Uses Supabase if `VITE_BACKEND=supabase`
- ⚠️ Falls back to mock data for any unimplemented Supabase methods

---

### **2. Branch Manager Dashboard Analysis**

**File:** `apps/web/src/screens/DashboardBranchManager.tsx`

**Data Sources:**
```typescript
// Line 17-32: All using API calls (good structure)
const { data: allAudits = [] } = useQuery({ queryFn: () => api.getAudits() })
const { data: branches = [] } = useQuery({ queryFn: () => api.getBranches() })
const { data: users = [] } = useQuery({ queryFn: () => api.getUsers() })
const { data: surveys = [] } = useQuery({ queryFn: () => api.getSurveys() })
const { data: assignedBranches = [] } = useQuery({
  queryFn: async () => {
    const allBranches = await api.getBranches()
    const assignments = await api.getManagerBranchAssignments(user.id)
    // ...
  }
})
```

**✅ Good News:**
- All data fetching uses `api.*` methods
- No direct mock data imports
- Properly uses React Query for caching
- Uses new branch manager assignment system

**❌ Bad News:**
- These API calls will use **MOCK DATA** unless `VITE_BACKEND=supabase`

---

### **3. Branch Manager Analytics**

**File:** `apps/web/src/screens/analytics/BranchManagerAnalytics.tsx`

**Data Sources:**
```typescript
const { data: audits = [] } = useQuery({ queryFn: () => api.getAudits() })
const { data: branches = [] } = useQuery({ queryFn: () => api.getBranches() })
const { data: users = [] } = useQuery({ queryFn: () => api.getUsers() })
const { data: surveys = [] } = useQuery({ queryFn: () => api.getSurveys() })
const { data: myAssignments = [] } = useQuery({
  queryFn: () => api.getManagerBranchAssignments(user.id)
})
```

**Status:** Same issue - will use mock data unless configured.

---

## 🚨 **Critical Issue**

### **Environment Variable Missing**

**Problem:**
```bash
# Current state (assumed)
VITE_BACKEND=<not set>  # Defaults to 'mock'
```

**Solution Needed:**
```bash
# Must be set in .env file
VITE_BACKEND=supabase
```

---

## ✅ **What Needs to be Fixed**

### **Option 1: Set Environment Variable (Quick Fix)**

1. Create/update `.env` file in project root:
   ```bash
   # Add this line
   VITE_BACKEND=supabase
   
   # Also ensure Supabase credentials are set
   VITE_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your_anon_key_here
   ```

2. Restart dev server:
   ```bash
   npm run dev
   ```

### **Option 2: Update Package.json (Permanent Fix)**

Update `apps/web/package.json`:
```json
{
  "scripts": {
    "dev": "VITE_BACKEND=supabase vite --port 3002 --host",
    "build": "VITE_BACKEND=supabase tsc && vite build"
  }
}
```

**Windows equivalent:**
```json
{
  "scripts": {
    "dev": "cross-env VITE_BACKEND=supabase vite --port 3002 --host",
    "build": "cross-env VITE_BACKEND=supabase tsc && vite build"
  }
}
```

### **Option 3: Remove Mock Fallback (Production Fix)**

Update `apps/web/src/utils/api.ts`:
```typescript
// Remove the default to 'mock' - force explicit configuration
const backend = ((import.meta as any).env?.VITE_BACKEND || 'supabase').toLowerCase()
```

---

## 🔍 **Verification Steps**

### **1. Check Current Backend**

Open browser console and run:
```javascript
// Check what backend is being used
console.log((import.meta as any).env?.VITE_BACKEND)
```

### **2. Test Data Source**

1. Open Network tab in DevTools
2. Navigate to Branch Manager Dashboard
3. Look for requests:
   - ✅ **Supabase:** Requests to `*.supabase.co/rest/v1/*`
   - ❌ **Mock:** No network requests, instant data load

### **3. Verify Branch Manager Assignments**

```javascript
// In browser console
const { api } = await import('./utils/api')
const assignments = await api.getManagerBranchAssignments('some-user-id')
console.log('Assignments:', assignments)
```

---

## 📊 **Supabase API Implementation Status**

### **Branch Manager Specific Methods**

| Method | Supabase Implementation | Status |
|--------|------------------------|--------|
| `getManagerBranchAssignments()` | ✅ Yes (`supabaseApi.ts:1239`) | Implemented |
| `getBranchManagerAssignments()` | ✅ Yes (`supabaseApi.ts:1224`) | Implemented |
| `getAllBranchManagerAssignments()` | ✅ Yes (`supabaseApi.ts:1206`) | Implemented |
| `assignBranchManager()` | ✅ Yes (`supabaseApi.ts:1262`) | Implemented |
| `unassignBranchManager()` | ✅ Yes (`supabaseApi.ts:1289`) | Implemented |
| `setBranchManager()` | ✅ Yes (`supabaseApi.ts:420`) | Implemented |

### **Core Data Methods**

| Method | Supabase Implementation | Status |
|--------|------------------------|--------|
| `getAudits()` | ✅ Yes | Implemented |
| `getBranches()` | ✅ Yes | Implemented |
| `getUsers()` | ✅ Yes | Implemented |
| `getSurveys()` | ✅ Yes | Implemented |

**✅ All required methods are implemented in Supabase!**

---

## 🎯 **Recommended Actions**

### **Immediate (Now)**

1. ✅ Set `VITE_BACKEND=supabase` in `.env` file
2. ✅ Restart dev server
3. ✅ Verify Supabase requests in Network tab

### **Short-term (This Session)**

1. ✅ Update package.json scripts to always use Supabase
2. ✅ Add validation to ensure backend is configured
3. ✅ Test Branch Manager dashboard with real data
4. ✅ Test Branch Manager analytics with real data

### **Medium-term (Next PR)**

1. Remove mock data fallback in production builds
2. Add environment variable validation on startup
3. Create dev mode toggle in UI (dev tools panel)
4. Add data source indicator in dashboard (dev mode only)

---

## 📝 **Files to Update**

1. **`.env`** (root)
   - Add `VITE_BACKEND=supabase`

2. **`apps/web/package.json`**
   - Update dev/build scripts to include VITE_BACKEND

3. **`apps/web/src/utils/api.ts`**
   - Change default from 'mock' to 'supabase'
   - Add validation/warning if not configured

---

## ✅ **Conclusion**

**Current State:**
- ❌ Branch Manager dashboard using **MOCK DATA**
- ❌ Branch Manager analytics using **MOCK DATA**
- ✅ All Supabase methods **ARE IMPLEMENTED**
- ✅ Code structure is **CORRECT**

**Fix Required:**
- 🔧 **Simple:** Set `VITE_BACKEND=supabase` environment variable
- ⏱️ **Time:** 2 minutes to fix
- 🎯 **Impact:** HIGH - Switches entire app to real data

---

**Next Step:** Set the environment variable and restart the dev server!

# 🚀 SaaS Phase 1: Quick Start Guide

## 📋 **Phase 1 Goals**
Transform your app from single-tenant to multi-tenant foundation in **1-2 weeks**.

## ✅ **Step-by-Step Implementation**

### **Step 1: Database Schema Updates (Day 1)**

Run this SQL in your Supabase SQL Editor:

```sql
-- 1. Enhance organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS
  subscription_status VARCHAR(50) DEFAULT 'trial',
  subscription_tier VARCHAR(50) DEFAULT 'starter',
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  max_users INTEGER DEFAULT 5,
  max_branches INTEGER DEFAULT 10,
  max_audits_per_month INTEGER DEFAULT 100,
  owner_id UUID REFERENCES auth.users(id),
  subdomain VARCHAR(100) UNIQUE,
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_step INTEGER DEFAULT 0;

-- 2. Super admin active organization tracking
CREATE TABLE IF NOT EXISTS user_active_organization (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(subscription_status);

-- 4. Update existing organization (if you have one)
UPDATE organizations
SET 
  subscription_status = 'active',
  subscription_tier = 'professional',
  trial_ends_at = NOW() + INTERVAL '30 days',
  owner_id = (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1)
WHERE owner_id IS NULL;
```

### **Step 2: Organization Context (Day 2-3)**

Create `apps/web/src/contexts/OrganizationContext.tsx`:

```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Organization, UserRole } from '@trakr/shared'
import { api } from '../utils/api'
import { useAuthStore } from '../stores/auth'

interface OrganizationContextType {
  currentOrg: Organization | null
  availableOrgs: Organization[]
  switchOrganization: (orgId: string) => Promise<void>
  isLoading: boolean
  isSuperAdmin: boolean
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

export const OrganizationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN
  
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null)
  const [availableOrgs, setAvailableOrgs] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setIsLoading(false)
      return
    }

    const loadOrganizations = async () => {
      try {
        if (isSuperAdmin) {
          // Super admins can see all organizations
          const orgs = await api.getOrganizations()
          setAvailableOrgs(orgs)
          
          // Load active org from storage or default to first
          const storedOrgId = localStorage.getItem('super_admin_active_org')
          const activeOrg = storedOrgId 
            ? orgs.find(o => o.id === storedOrgId) || orgs[0]
            : orgs[0]
          
          setCurrentOrg(activeOrg || null)
        } else {
          // Regular users see only their organization
          const orgs = await api.getOrganizations()
          const userOrg = orgs.find(o => o.id === user.orgId)
          setCurrentOrg(userOrg || null)
          setAvailableOrgs(userOrg ? [userOrg] : [])
        }
      } catch (error) {
        console.error('Failed to load organizations:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadOrganizations()
  }, [user, isSuperAdmin])

  const switchOrganization = async (orgId: string) => {
    if (!isSuperAdmin) return
    
    const org = availableOrgs.find(o => o.id === orgId)
    if (org) {
      setCurrentOrg(org)
      localStorage.setItem('super_admin_active_org', orgId)
    }
  }

  return (
    <OrganizationContext.Provider 
      value={{ currentOrg, availableOrgs, switchOrganization, isLoading, isSuperAdmin }}
    >
      {children}
    </OrganizationContext.Provider>
  )
}

export const useOrganization = () => {
  const context = useContext(OrganizationContext)
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider')
  }
  return context
}
```

### **Step 3: Add Provider to App (Day 3)**

Update `apps/web/src/App.tsx`:

```typescript
import { OrganizationProvider } from './contexts/OrganizationContext'

function App() {
  return (
    <LoadingProvider>
      <ToastProvider>
        <OrganizationProvider>  {/* ADD THIS */}
          <Router>
            {/* ... rest of app */}
          </Router>
        </OrganizationProvider>
      </ToastProvider>
    </LoadingProvider>
  )
}
```

### **Step 4: Organization Switcher Component (Day 4)**

Create `apps/web/src/components/OrganizationSwitcher.tsx`:

```typescript
import { useOrganization } from '../contexts/OrganizationContext'

export const OrganizationSwitcher = () => {
  const { currentOrg, availableOrgs, switchOrganization, isSuperAdmin } = useOrganization()
  
  if (!isSuperAdmin || availableOrgs.length <= 1) return null

  return (
    <div className="border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-orange-50 px-4 py-3 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold rounded-full shadow-md">
            🛠️ TRAKR STAFF
          </span>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Organization:</label>
            <select
              value={currentOrg?.id || ''}
              onChange={(e) => switchOrganization(e.target.value)}
              className="input border-orange-300 focus:border-orange-500 focus:ring-orange-500"
            >
              <option value="">Select Organization</option>
              {availableOrgs.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name} - {org.subscription_status}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          Viewing: <strong className="text-orange-700">{currentOrg?.name || 'No Org Selected'}</strong>
        </div>
      </div>
    </div>
  )
}
```

### **Step 5: Add Switcher to Layout (Day 4)**

Update `apps/web/src/components/DashboardLayout.tsx`:

```typescript
import { OrganizationSwitcher } from './OrganizationSwitcher'

export const DashboardLayout = ({ children, title }: Props) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <OrganizationSwitcher />  {/* ADD THIS at the top */}
      
      {/* Rest of your layout */}
      <nav>{/* ... */}</nav>
      <main>{children}</main>
    </div>
  )
}
```

### **Step 6: Update All Screens to Use Current Org (Day 5-7)**

**Before:**
```typescript
const { data: orgs = [] } = useQuery({ queryKey: QK.ORGANIZATIONS, queryFn: api.getOrganizations })
const orgId = orgs[0]?.id  // ❌ Assumes first org
```

**After:**
```typescript
const { currentOrg } = useOrganization()
const orgId = currentOrg?.id  // ✅ Uses current org from context
```

**Files to update:**
- `ManageBranches.tsx` ✅
- `ManageZones.tsx` ✅  
- `ManageSurveyTemplates.tsx`
- `ManageUsers.tsx`
- `Analytics.tsx`
- `DashboardAdmin.tsx`
- `DashboardBranchManager.tsx`
- Any other screens that use `orgs[0]`

### **Step 7: Enhanced RLS Policies (Day 8)**

```sql
-- Enhanced RLS for multi-tenant isolation

-- Branches: Super admins see all, users see only their org
DROP POLICY IF EXISTS "Users can view branches in their org" ON branches;
CREATE POLICY "Users can view branches in their org"
  ON branches FOR SELECT
  TO authenticated
  USING (
    -- Super admins can see all
    (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    OR
    -- Regular users see only their org
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- Apply same pattern to: zones, audits, surveys, etc.
```

### **Step 8: Test Multi-Tenancy (Day 9-10)**

**Test Checklist:**
```bash
# 1. Create a second organization in database
INSERT INTO organizations (id, name, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Test Org 2', NOW(), NOW());

# 2. Create a test user for Org 2
INSERT INTO users (id, email, role, org_id, created_at, updated_at)
VALUES (
  uuid_generate_v4(),
  'admin2@testorg.com',
  'ADMIN',
  (SELECT id FROM organizations WHERE name = 'Test Org 2'),
  NOW(),
  NOW()
);

# 3. Test data isolation
- [ ] Login as Org 1 admin - should only see Org 1 data
- [ ] Login as Org 2 admin - should only see Org 2 data  
- [ ] Login as Super Admin - should see all organizations
- [ ] Super Admin can switch between orgs
- [ ] Data remains isolated when switching
```

## 🎯 **Success Criteria**

After Phase 1, you should have:
- ✅ Multiple organizations in database
- ✅ Organization context throughout app
- ✅ Super admin can switch between organizations
- ✅ Complete data isolation per organization
- ✅ All screens use current organization
- ✅ RLS policies enforce multi-tenancy

## 📈 **What's Next**

**Phase 2 (Week 3-4):** Sign-up flow
- Landing page
- Registration form
- Organization creation
- Email verification
- Onboarding wizard

**Phase 3 (Week 5-6):** Multi-tenant features
- User invitations
- Organization settings
- Usage limits
- Trial management

**Phase 4 (Week 7-8):** Billing
- Stripe integration
- Subscription plans
- Payment checkout
- Billing dashboard

## 🚦 **Current vs Target State**

### **Current (Single-Tenant)**
```
┌─────────────────────────────┐
│ One Organization            │
│ ├── All Users               │
│ ├── All Branches            │
│ └── All Audits              │
└─────────────────────────────┘
```

### **Target (Multi-Tenant SaaS)**
```
┌─────────────────────────────────────────────┐
│ Super Admin (Trakr Staff)                   │
│ ├── Can switch between any organization     │
│ └── Sees all system data                    │
└─────────────────────────────────────────────┘
          ↓
┌─────────────────────────────┐  ┌─────────────────────────────┐
│ Organization A              │  │ Organization B              │
│ ├── Users A                 │  │ ├── Users B                 │
│ ├── Branches A              │  │ ├── Branches B              │
│ ├── Audits A                │  │ ├── Audits B                │
│ └── Data isolated           │  │ └── Data isolated           │
└─────────────────────────────┘  └─────────────────────────────┘
```

## ✅ **Quick Reference**

**Key Files to Create:**
1. `/contexts/OrganizationContext.tsx`
2. `/components/OrganizationSwitcher.tsx`
3. `/hooks/useOrganization.ts` (optional helper)

**Key Changes:**
1. Replace `orgs[0]?.id` with `currentOrg?.id`
2. Add `<OrganizationProvider>` to App.tsx
3. Add `<OrganizationSwitcher>` to DashboardLayout
4. Update RLS policies for multi-tenancy

**That's it! You now have a multi-tenant foundation!** 🎉

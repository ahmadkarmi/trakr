# 🚀 SaaS Multi-Tenancy Architecture Plan

## 📋 **Current State Analysis**

### **✅ What You Already Have (Good Foundation)**
- ✅ `organizations` table with `org_id` on all major tables
- ✅ `SUPER_ADMIN` role in the schema
- ✅ User authentication with Supabase Auth
- ✅ RLS policies (need enhancement for multi-tenancy)
- ✅ Organization-scoped data model

### **❌ What Needs to Change**
- ❌ Single organization assumption (`orgs[0]`)
- ❌ No organization signup/onboarding flow
- ❌ No organization selection for users
- ❌ Super Admin can't switch between organizations
- ❌ No payment/subscription tracking
- ❌ RLS policies don't enforce organization boundaries

## 🎯 **Proposed SaaS Architecture**

### **User Roles Hierarchy**

```
┌─────────────────────────────────────────────┐
│ SUPER_ADMIN (Trakr Staff)                  │
│ - Access ALL organizations                  │
│ - Can switch between any organization       │
│ - Manage billing, users, settings for any  │
│ - View system-wide analytics                │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ ADMIN (Client Organization Admin)           │
│ - Access ONLY their organization            │
│ - Manage users, branches, zones in their org│
│ - View organization analytics                │
│ - Manage subscription/billing               │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ BRANCH_MANAGER (Store Manager)              │
│ - Access ONLY assigned branches in org      │
│ - Approve audits for their branches         │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ AUDITOR (Field Auditor)                     │
│ - Access ONLY assigned branches in org      │
│ - Conduct audits                            │
└─────────────────────────────────────────────┘
```

## 📊 **Database Schema Changes**

### **1. Organizations Table Enhancement**

```sql
-- Add subscription and tenant metadata
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS
  subscription_status VARCHAR(50) DEFAULT 'trial', -- trial, active, suspended, cancelled
  subscription_tier VARCHAR(50) DEFAULT 'starter', -- starter, professional, enterprise
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  max_users INTEGER DEFAULT 5,
  max_branches INTEGER DEFAULT 10,
  max_audits_per_month INTEGER DEFAULT 100,
  stripe_customer_id VARCHAR(255), -- for payment integration
  stripe_subscription_id VARCHAR(255),
  owner_id UUID REFERENCES auth.users(id), -- User who created the org
  subdomain VARCHAR(100) UNIQUE, -- Optional: mycompany.trakr.app
  custom_domain VARCHAR(255), -- Optional: audit.mycompany.com
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_step INTEGER DEFAULT 0;

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(subscription_status);
```

### **2. User Organization Membership**

```sql
-- Add organization relationship to users
-- (users table already has org_id, but enhance it)

-- For Super Admins: track current active organization
CREATE TABLE IF NOT EXISTS user_active_organization (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track which orgs a super admin has access to (for audit trail)
CREATE TABLE IF NOT EXISTS super_admin_organization_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, org_id)
);
```

### **3. Organization Invitations**

```sql
CREATE TABLE IF NOT EXISTS organization_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, email)
);

CREATE INDEX idx_invitations_token ON organization_invitations(token);
CREATE INDEX idx_invitations_org ON organization_invitations(org_id);
```

### **4. Usage Tracking (for billing)**

```sql
CREATE TABLE IF NOT EXISTS organization_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  audits_count INTEGER DEFAULT 0,
  users_count INTEGER DEFAULT 0,
  branches_count INTEGER DEFAULT 0,
  storage_mb INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, period_start)
);

CREATE INDEX idx_usage_org_period ON organization_usage(org_id, period_start);
```

## 🔐 **Enhanced RLS Policies**

### **Multi-Tenant Data Isolation**

```sql
-- Example for branches table (apply pattern to all tables)
DROP POLICY IF EXISTS "Users can view branches in their org" ON branches;
CREATE POLICY "Users can view branches in their org"
  ON branches FOR SELECT
  TO authenticated
  USING (
    -- Super admins can see all
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'SUPER_ADMIN'
    )
    OR
    -- Regular users see only their org
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

-- For super admins accessing specific org context
CREATE POLICY "Super admins can access via active org"
  ON branches FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      LEFT JOIN user_active_organization uao ON uao.user_id = u.id
      WHERE u.id = auth.uid()
      AND u.role = 'SUPER_ADMIN'
      AND (branches.org_id = uao.active_org_id OR uao.active_org_id IS NULL)
    )
  );
```

## 🎨 **Frontend Architecture Changes**

### **1. Organization Context Provider**

```typescript
// apps/web/src/contexts/OrganizationContext.tsx
interface OrganizationContextType {
  currentOrg: Organization | null
  availableOrgs: Organization[] // For super admins
  switchOrganization: (orgId: string) => Promise<void>
  isLoading: boolean
  isSuperAdmin: boolean
}

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN
  
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null)
  const [availableOrgs, setAvailableOrgs] = useState<Organization[]>([])

  // For super admins: fetch all organizations
  // For regular users: fetch their organization
  useEffect(() => {
    if (!user) return
    
    if (isSuperAdmin) {
      // Load all organizations for super admin
      api.getAllOrganizations().then(setAvailableOrgs)
      // Load active org from user_active_organization
      api.getSuperAdminActiveOrg(user.id).then(setCurrentOrg)
    } else {
      // Load user's organization
      api.getOrganization(user.orgId).then(setCurrentOrg)
    }
  }, [user])

  const switchOrganization = async (orgId: string) => {
    if (!isSuperAdmin) return
    await api.setSuperAdminActiveOrg(user.id, orgId)
    const org = await api.getOrganization(orgId)
    setCurrentOrg(org)
  }

  return (
    <OrganizationContext.Provider value={{ currentOrg, availableOrgs, switchOrganization, isLoading, isSuperAdmin }}>
      {children}
    </OrganizationContext.Provider>
  )
}
```

### **2. Organization Switcher (For Super Admins)**

```typescript
// apps/web/src/components/OrganizationSwitcher.tsx
export const OrganizationSwitcher: React.FC = () => {
  const { currentOrg, availableOrgs, switchOrganization, isSuperAdmin } = useOrganization()
  
  if (!isSuperAdmin) return null

  return (
    <div className="border-b border-gray-200 bg-yellow-50 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs font-bold rounded">
            TRAKR STAFF
          </span>
          <select
            value={currentOrg?.id || ''}
            onChange={(e) => switchOrganization(e.target.value)}
            className="input"
          >
            <option value="">Select Organization</option>
            {availableOrgs.map(org => (
              <option key={org.id} value={org.id}>
                {org.name} ({org.subscription_status})
              </option>
            ))}
          </select>
        </div>
        <div className="text-sm text-gray-600">
          Viewing: <strong>{currentOrg?.name || 'No Organization Selected'}</strong>
        </div>
      </div>
    </div>
  )
}
```

### **3. Organization Signup Flow**

```typescript
// apps/web/src/screens/Signup.tsx
export const SignupScreen: React.FC = () => {
  const [step, setStep] = useState<'account' | 'organization' | 'payment' | 'complete'>('account')
  
  const [accountData, setAccountData] = useState({
    email: '',
    password: '',
    fullName: ''
  })
  
  const [orgData, setOrgData] = useState({
    name: '',
    industry: '',
    size: '',
    country: ''
  })

  const handleSignup = async () => {
    // Step 1: Create auth user
    const { user } = await supabase.auth.signUp({
      email: accountData.email,
      password: accountData.password,
      options: {
        data: {
          full_name: accountData.fullName
        }
      }
    })

    // Step 2: Create organization
    const org = await api.createOrganization({
      name: orgData.name,
      ownerId: user.id,
      subscriptionStatus: 'trial',
      trialEndsAt: addDays(new Date(), 14) // 14-day trial
    })

    // Step 3: Create user profile with org_id
    await api.createUser({
      id: user.id,
      email: accountData.email,
      name: accountData.fullName,
      role: UserRole.ADMIN,
      orgId: org.id
    })

    // Step 4: Redirect to onboarding
    navigate('/onboarding')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      {step === 'account' && <AccountStep onNext={setStep} data={accountData} setData={setAccountData} />}
      {step === 'organization' && <OrganizationStep onNext={setStep} data={orgData} setData={setOrgData} />}
      {step === 'payment' && <PaymentStep onNext={setStep} />}
      {step === 'complete' && <CompleteStep />}
    </div>
  )
}
```

### **4. Update All API Calls to Use Current Org**

```typescript
// Before (assumes single org)
const branches = await api.getBranches(orgs[0]?.id)

// After (uses current org from context)
const { currentOrg } = useOrganization()
const branches = await api.getBranches(currentOrg?.id)
```

## 🔄 **Onboarding Flow**

### **Step-by-Step User Journey**

```
┌──────────────────────────────────────────────┐
│ 1. Landing Page                              │
│    → "Start Free Trial" button              │
└──────────────────────────────────────────────┘
                ↓
┌──────────────────────────────────────────────┐
│ 2. Signup - Account Info                    │
│    - Email                                   │
│    - Password                                │
│    - Full Name                               │
└──────────────────────────────────────────────┘
                ↓
┌──────────────────────────────────────────────┐
│ 3. Signup - Organization Info                │
│    - Company Name                            │
│    - Industry (dropdown)                     │
│    - Company Size (dropdown)                 │
│    - Country                                 │
└──────────────────────────────────────────────┘
                ↓
┌──────────────────────────────────────────────┐
│ 4. Email Verification                        │
│    → User receives email                     │
│    → Clicks verification link                │
└──────────────────────────────────────────────┘
                ↓
┌──────────────────────────────────────────────┐
│ 5. Onboarding Wizard (In-App)               │
│    Step 1: Create first zone                 │
│    Step 2: Create first branch               │
│    Step 3: Invite team members               │
│    Step 4: Create first survey template      │
│    → Mark onboarding_completed = true        │
└──────────────────────────────────────────────┘
                ↓
┌──────────────────────────────────────────────┐
│ 6. Main Application                          │
│    → 14-day trial banner at top              │
│    → Full access to all features             │
└──────────────────────────────────────────────┘
                ↓ (Day 10 of trial)
┌──────────────────────────────────────────────┐
│ 7. Payment Prompt                            │
│    → In-app notification                     │
│    → Email reminders                         │
│    → "Upgrade Now" button                    │
└──────────────────────────────────────────────┘
                ↓
┌──────────────────────────────────────────────┐
│ 8. Payment Integration                       │
│    → Stripe Checkout                         │
│    → Select Plan (Starter/Pro/Enterprise)    │
│    → Enter payment details                   │
│    → subscription_status = 'active'          │
└──────────────────────────────────────────────┘
```

## 💳 **Subscription Tiers (Example)**

```typescript
export const SUBSCRIPTION_TIERS = {
  starter: {
    name: 'Starter',
    price: 49,
    currency: 'USD',
    interval: 'month',
    features: {
      maxUsers: 5,
      maxBranches: 10,
      maxAuditsPerMonth: 100,
      support: 'email',
      customBranding: false,
      apiAccess: false
    }
  },
  professional: {
    name: 'Professional',
    price: 149,
    currency: 'USD',
    interval: 'month',
    features: {
      maxUsers: 25,
      maxBranches: 50,
      maxAuditsPerMonth: 500,
      support: 'priority',
      customBranding: true,
      apiAccess: true
    }
  },
  enterprise: {
    name: 'Enterprise',
    price: 499,
    currency: 'USD',
    interval: 'month',
    features: {
      maxUsers: -1, // unlimited
      maxBranches: -1,
      maxAuditsPerMonth: -1,
      support: 'dedicated',
      customBranding: true,
      apiAccess: true,
      sso: true,
      customDomain: true
    }
  }
}
```

## 🚦 **Implementation Phases**

### **Phase 1: Foundation (Week 1-2)**
- [ ] Database schema updates (organizations enhancement)
- [ ] RLS policies for multi-tenancy
- [ ] Organization context provider
- [ ] Update auth store to include org context
- [ ] Super admin organization switcher

### **Phase 2: Signup & Onboarding (Week 3-4)**
- [ ] Landing page
- [ ] Signup flow (account + organization)
- [ ] Email verification
- [ ] Onboarding wizard
- [ ] Trial management

### **Phase 3: Multi-Tenant Updates (Week 5-6)**
- [ ] Update all API calls to use current org
- [ ] Test data isolation
- [ ] Super admin dashboard (view all orgs)
- [ ] Organization management UI
- [ ] User invitation system

### **Phase 4: Subscription & Billing (Week 7-8)**
- [ ] Stripe integration
- [ ] Subscription plans UI
- [ ] Payment checkout flow
- [ ] Usage tracking
- [ ] Billing dashboard

### **Phase 5: Polish & Launch (Week 9-10)**
- [ ] Trial expiration handling
- [ ] Subscription suspension/cancellation
- [ ] Email notifications
- [ ] Admin tools for Trakr staff
- [ ] Analytics dashboard
- [ ] Documentation

## 📁 **File Structure**

```
apps/web/src/
├── contexts/
│   ├── OrganizationContext.tsx          [NEW]
│   └── SubscriptionContext.tsx          [NEW]
│
├── components/
│   ├── OrganizationSwitcher.tsx         [NEW]
│   ├── TrialBanner.tsx                  [NEW]
│   ├── UpgradePrompt.tsx                [NEW]
│   └── BillingWidget.tsx                [NEW]
│
├── screens/
│   ├── Signup.tsx                       [NEW]
│   ├── Onboarding.tsx                   [NEW]
│   ├── Billing.tsx                      [NEW]
│   ├── OrganizationSettings.tsx         [NEW]
│   └── SuperAdminDashboard.tsx          [NEW]
│
├── hooks/
│   ├── useOrganization.ts               [NEW]
│   ├── useSubscription.ts               [NEW]
│   └── useBilling.ts                    [NEW]
│
└── utils/
    ├── stripe.ts                        [NEW]
    └── subscription.ts                  [NEW]
```

## ✅ **Migration Strategy**

### **For Existing Data**

```sql
-- Migrate existing setup to multi-tenant model
-- Assuming you have one organization already

-- 1. Ensure all existing users have org_id
UPDATE users 
SET org_id = (SELECT id FROM organizations LIMIT 1)
WHERE org_id IS NULL;

-- 2. Set organization owner
UPDATE organizations
SET owner_id = (
  SELECT id FROM users 
  WHERE role = 'ADMIN' 
  AND org_id = organizations.id 
  LIMIT 1
);

-- 3. Set trial period for existing org
UPDATE organizations
SET 
  subscription_status = 'active',
  subscription_tier = 'professional',
  subscription_start_date = NOW(),
  trial_ends_at = NOW() + INTERVAL '30 days';
```

## 🎯 **Key Benefits of This Architecture**

### **For You (Trakr)**
- ✅ **Scalable** - Add unlimited clients
- ✅ **Secure** - Complete data isolation per organization
- ✅ **Manageable** - Super admins can support any client
- ✅ **Profitable** - Built-in subscription management
- ✅ **Trackable** - Usage metrics for billing

### **For Clients**
- ✅ **Self-service** - Sign up and start immediately
- ✅ **Trial period** - 14 days free to evaluate
- ✅ **Flexible** - Choose plan that fits their needs
- ✅ **Secure** - Their data is completely isolated
- ✅ **Professional** - Full-featured audit management system

## 📊 **Super Admin Dashboard**

```typescript
// What super admins see
interface SuperAdminDashboard {
  stats: {
    totalOrganizations: number
    activeSubscriptions: number
    trialOrganizations: number
    monthlyRecurringRevenue: number
    totalUsers: number
    totalAudits: number
  }
  recentOrganizations: Organization[]
  recentActivity: Activity[]
  usageByOrganization: UsageMetric[]
}
```

## 🚀 **Next Steps**

1. **Review this plan** - Make sure it aligns with your vision
2. **Start with Phase 1** - Foundation changes
3. **Test multi-tenancy** - Ensure data isolation works
4. **Build signup flow** - Get new clients onboarding
5. **Add Stripe later** - Focus on core functionality first

**This architecture transforms your single-tenant app into a scalable SaaS platform while maintaining your existing features!** 🎉

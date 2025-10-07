# Multi-Tenant Data Isolation Implementation Plan

## 🎯 Objective
Ensure complete data isolation between organizations to support true SaaS multi-tenancy.

## 🏗️ Architecture Hierarchy

```
Super Admin (Trakr Staff)
  ├─ Can view ALL organizations (global view)
  └─ Can switch to specific organization (org view)

Organization Admin
  ├─ Full control of their organization
  ├─ Invites Branch Managers
  ├─ Invites Auditors
  └─ Manages: Surveys, Branches, Zones, Audits

Branch Manager (org-scoped)
  ├─ Manages assigned branches
  └─ Approves/Rejects audits

Auditor (org-scoped)
  └─ Conducts audits for assigned branches
```

## 🔴 Current Issues

### 1. **API Functions Without Org Filtering**

**File:** `apps/web/src/utils/supabaseApi.ts`

```typescript
// ❌ PROBLEM: Fetches ALL users from ALL orgs
async getUsers(): Promise<User[]> {
  const { data, error } = await supabase.from('users').select('*')
  return (data || []).map(mapUser)
}

// ❌ PROBLEM: Fetches ALL surveys from ALL orgs
async getSurveys() {
  const { data, error } = await supabase.from('surveys').select('*')
  return mapSurveys(data)
}

// ⚠️ PROBLEM: orgId is optional, not always used
async getAudits(filters?: { orgId?: string }): Promise<Audit[]> {
  let q = supabase.from('audits').select('*')
  if (filters?.orgId) q = q.eq('org_id', filters.orgId) // Optional!
}

// ⚠️ PROBLEM: orgId is optional, not always used
async getBranches(orgId?: string): Promise<Branch[]> {
  let q = supabase.from('branches').select('*')
  if (orgId) q = q.eq('org_id', orgId) // Optional!
}
```

### 2. **Components Not Using Organization Context**

Many components call APIs without passing `effectiveOrgId`:

```typescript
// ❌ Example from ManageUsers.tsx
const { data: users = [] } = useQuery({
  queryKey: ['users'],
  queryFn: () => api.getUsers() // No orgId!
})

// ❌ Example from ManageSurveyTemplates.tsx
const { data: surveys = [] } = useQuery({
  queryKey: QK.SURVEYS,
  queryFn: api.getSurveys // No orgId!
})
```

## ✅ Solution

### Phase 1: Update API Layer

**File:** `apps/web/src/utils/supabaseApi.ts`

```typescript
// ✅ FIXED: Require orgId (except for Super Admin global view)
async getUsers(orgId?: string): Promise<User[]> {
  const supabase = await getSupabase()
  let q = supabase.from('users').select('*')
  
  // Filter by org unless Super Admin in global view (orgId = undefined)
  if (orgId) {
    q = q.eq('org_id', orgId)
  }
  
  const { data, error } = await q.order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map(mapUser)
}

// ✅ FIXED: Require orgId for surveys
async getSurveys(orgId?: string): Promise<Survey[]> {
  const supabase = await getSupabase()
  let q = supabase.from('surveys').select('*')
  
  if (orgId) {
    q = q.eq('org_id', orgId)
  }
  
  const { data, error } = await q.order('updated_at', { ascending: false })
  if (error) throw error
  return mapSurveys(data)
}

// ✅ FIXED: Make orgId filtering mandatory when provided
async getAudits(filters?: { 
  assignedTo?: string
  status?: AuditStatus
  branchId?: string
  orgId?: string
}): Promise<Audit[]> {
  const supabase = await getSupabase()
  let q = supabase.from('audits').select('*')
  
  // ALWAYS filter by orgId if provided
  if (filters?.orgId !== undefined) {
    q = q.eq('org_id', filters.orgId)
  }
  
  if (filters?.assignedTo) q = q.eq('assigned_to', filters.assignedTo)
  if (filters?.status) q = q.eq('status', filters.status)
  if (filters?.branchId) q = q.eq('branch_id', filters.branchId)
  
  const { data, error } = await q.order('updated_at', { ascending: false })
  if (error) throw error
  return (data || []).map(mapAudit)
}

// ✅ Already has orgId parameter, just enforce it
async getBranches(orgId?: string): Promise<Branch[]> {
  const supabase = await getSupabase()
  let q = supabase.from('branches').select('*')
  
  if (orgId) {
    q = q.eq('org_id', orgId)
  }
  
  const { data, error } = await q.order('name', { ascending: true })
  if (error) throw error
  return (data || []).map(mapBranch)
}

// ✅ Already has orgId parameter, just enforce it
async getZones(orgId?: string): Promise<Zone[]> {
  const supabase = await getSupabase()
  let q = supabase.from('zones').select('*')
  
  if (orgId) {
    q = q.eq('org_id', orgId)
  }
  
  const { data: zones, error: zonesError } = await q
  if (zonesError) throw zonesError
  
  // ... rest of implementation
}
```

### Phase 2: Update All Components

**Use OrganizationContext in every component:**

```typescript
import { useOrganization } from '../contexts/OrganizationContext'

const MyComponent: React.FC = () => {
  const { effectiveOrgId } = useOrganization()
  
  // ✅ CORRECT: Pass effectiveOrgId to all queries
  const { data: users = [] } = useQuery({
    queryKey: ['users', effectiveOrgId],
    queryFn: () => api.getUsers(effectiveOrgId),
    enabled: !!effectiveOrgId || isSuperAdmin
  })
  
  const { data: surveys = [] } = useQuery({
    queryKey: ['surveys', effectiveOrgId],
    queryFn: () => api.getSurveys(effectiveOrgId),
    enabled: !!effectiveOrgId || isSuperAdmin
  })
  
  const { data: audits = [] } = useQuery({
    queryKey: ['audits', effectiveOrgId],
    queryFn: () => api.getAudits({ orgId: effectiveOrgId }),
    enabled: !!effectiveOrgId || isSuperAdmin
  })
}
```

### Phase 3: Database Schema Verification

**Ensure all tables have org_id:**

```sql
-- ✅ Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  logo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ✅ Users table (has org_id foreign key)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ✅ Surveys table (needs org_id)
CREATE TABLE surveys (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id), -- REQUIRED
  name TEXT NOT NULL,
  questions JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ✅ Branches table (has org_id)
CREATE TABLE branches (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ✅ Zones table (has org_id)
CREATE TABLE zones (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ✅ Audits table (has org_id)
CREATE TABLE audits (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  branch_id UUID REFERENCES branches(id),
  survey_id UUID REFERENCES surveys(id),
  assigned_to UUID REFERENCES users(id),
  status TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Phase 4: Row Level Security (RLS) Policies

**Supabase RLS for automatic enforcement:**

```sql
-- Users can only see users from their own organization
CREATE POLICY users_isolation ON users
  FOR SELECT
  USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
  );

-- Users can only see surveys from their own organization
CREATE POLICY surveys_isolation ON surveys
  FOR SELECT
  USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
  );

-- Users can only see branches from their own organization
CREATE POLICY branches_isolation ON branches
  FOR SELECT
  USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
  );

-- Users can only see zones from their own organization
CREATE POLICY zones_isolation ON zones
  FOR SELECT
  USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
  );

-- Users can only see audits from their own organization
CREATE POLICY audits_isolation ON audits
  FOR SELECT
  USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
  );
```

## 📝 Files That Need Changes

### API Layer
- [ ] `apps/web/src/utils/supabaseApi.ts` - Update all get methods to filter by orgId

### Components
- [ ] `apps/web/src/screens/ManageUsers.tsx` - Pass effectiveOrgId
- [ ] `apps/web/src/screens/ManageSurveyTemplates.tsx` - Pass effectiveOrgId
- [ ] `apps/web/src/screens/ManageBranches.tsx` - Pass effectiveOrgId
- [ ] `apps/web/src/screens/ManageZones.tsx` - Pass effectiveOrgId
- [ ] `apps/web/src/screens/analytics/AdminAnalytics.tsx` - Pass effectiveOrgId
- [ ] `apps/web/src/screens/analytics/BranchManagerAnalytics.tsx` - Pass effectiveOrgId
- [ ] `apps/web/src/screens/analytics/AuditorAnalytics.tsx` - Pass effectiveOrgId
- [ ] `apps/web/src/screens/SearchResults.tsx` - Pass effectiveOrgId
- [ ] `apps/web/src/screens/Notifications.tsx` - Pass effectiveOrgId
- [ ] `apps/web/src/screens/ActivityLogs.tsx` - Pass effectiveOrgId
- [ ] `apps/web/src/screens/AuditSummary.tsx` - Pass effectiveOrgId
- [ ] All other components fetching data

### Database
- [ ] Verify all tables have `org_id` column
- [ ] Add RLS policies for automatic enforcement
- [ ] Create indexes on `org_id` for performance

## 🧪 Testing Checklist

- [ ] Admin from Org A cannot see Org B's data
- [ ] Branch Manager from Org A cannot see Org B's branches
- [ ] Auditor from Org A cannot see Org B's audits
- [ ] Super Admin can see all organizations when in global view
- [ ] Super Admin sees only selected org when in org view
- [ ] User invites are scoped to organization
- [ ] Audit assignments are scoped to organization
- [ ] Search results are scoped to organization

## 🚀 Implementation Priority

1. **HIGH PRIORITY** - Fix API layer (getUsers, getSurveys, getAudits, getBranches)
2. **HIGH PRIORITY** - Update all components to use effectiveOrgId
3. **MEDIUM PRIORITY** - Add RLS policies to database
4. **LOW PRIORITY** - Add database indexes for performance

## ⚠️ Breaking Changes

**Note:** These changes may affect existing data and queries. Test thoroughly before deployment!

- API function signatures will change (new parameters)
- Components will need to pass effectiveOrgId
- Database queries will be filtered automatically
- Super Admins need to explicitly switch to "global view" to see all orgs

## 📊 Expected Outcome

After implementation:
- ✅ Complete data isolation between organizations
- ✅ Admins can only manage their own organization
- ✅ Branch Managers and Auditors are scoped to their organization
- ✅ Super Admins can view/manage any organization
- ✅ True SaaS multi-tenancy achieved
- ✅ Security compliance for multi-tenant applications

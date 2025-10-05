-- ========================================
-- SaaS Multi-Tenancy Database Schema
-- Phase 1: Foundation
-- ========================================

-- 0. Add SUPER_ADMIN to user_role enum if it doesn't exist
-- NOTE: Run this first, then run the rest of the script
-- Enum values need to be committed before use
DO $$ 
BEGIN
  -- Check if SUPER_ADMIN already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'SUPER_ADMIN' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    -- Add SUPER_ADMIN to the enum
    EXECUTE 'ALTER TYPE user_role ADD VALUE ''SUPER_ADMIN''';
    RAISE NOTICE '✅ Added SUPER_ADMIN to user_role enum';
  ELSE
    RAISE NOTICE 'ℹ️ SUPER_ADMIN already exists in user_role enum';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ℹ️ SUPER_ADMIN may already exist or there was an error';
END $$;

-- IMPORTANT: If you got an error above about "unsafe use of new value",
-- you need to run the SQL in TWO parts:
-- 1. First run everything above this line
-- 2. Then run everything below this line

-- ========================================
-- Continue with schema updates
-- ========================================

-- 1. Enhance organizations table with subscription and tenant metadata
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS max_branches INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS max_audits_per_month INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS subdomain VARCHAR(100),
  ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255),
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;

-- Add unique constraint for subdomain separately (can't use UNIQUE in ADD COLUMN)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'organizations_subdomain_key'
  ) THEN
    ALTER TABLE organizations ADD CONSTRAINT organizations_subdomain_key UNIQUE (subdomain);
  END IF;
END $$;

-- 2. Create table for super admin active organization tracking
CREATE TABLE IF NOT EXISTS user_active_organization (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create table for super admin access audit trail
CREATE TABLE IF NOT EXISTS super_admin_organization_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, org_id)
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(subscription_status);
CREATE INDEX IF NOT EXISTS idx_organizations_tier ON organizations(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_user_active_org ON user_active_organization(active_org_id);
CREATE INDEX IF NOT EXISTS idx_super_admin_access_user ON super_admin_organization_access(user_id);
CREATE INDEX IF NOT EXISTS idx_super_admin_access_org ON super_admin_organization_access(org_id);

-- 5. Update existing organization (set owner and subscription details)
UPDATE organizations
SET 
  subscription_status = 'active',
  subscription_tier = 'professional',
  subscription_start_date = NOW(),
  trial_ends_at = NOW() + INTERVAL '30 days',
  owner_id = (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1),
  onboarding_completed = true
WHERE owner_id IS NULL;

-- 6. Ensure all users have org_id (data migration)
UPDATE users 
SET org_id = (SELECT id FROM organizations LIMIT 1)
WHERE org_id IS NULL;

-- 7. Enhanced RLS Policies for Multi-Tenant Isolation

-- Branches: Super admins see all, regular users see only their org
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

DROP POLICY IF EXISTS "Users can insert branches in their org" ON branches;
CREATE POLICY "Users can insert branches in their org"
  ON branches FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'ADMIN')
    AND (
      (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
      OR org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update branches in their org" ON branches;
CREATE POLICY "Users can update branches in their org"
  ON branches FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'ADMIN')
    AND (
      (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
      OR org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete branches in their org" ON branches;
CREATE POLICY "Users can delete branches in their org"
  ON branches FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'ADMIN')
    AND (
      (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
      OR org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

-- Zones: Same multi-tenant pattern
DROP POLICY IF EXISTS "Users can view zones in their org" ON zones;
CREATE POLICY "Users can view zones in their org"
  ON zones FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    OR org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert zones in their org" ON zones;
CREATE POLICY "Users can insert zones in their org"
  ON zones FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'ADMIN')
    AND (
      (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
      OR org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update zones in their org" ON zones;
CREATE POLICY "Users can update zones in their org"
  ON zones FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'ADMIN')
    AND (
      (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
      OR org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete zones in their org" ON zones;
CREATE POLICY "Users can delete zones in their org"
  ON zones FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'ADMIN')
    AND (
      (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
      OR org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

-- Audits: Multi-tenant isolation
DROP POLICY IF EXISTS "Users can view audits in their org" ON audits;
CREATE POLICY "Users can view audits in their org"
  ON audits FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    OR org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert audits in their org" ON audits;
CREATE POLICY "Users can insert audits in their org"
  ON audits FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update audits in their org" ON audits;
CREATE POLICY "Users can update audits in their org"
  ON audits FOR UPDATE
  TO authenticated
  USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- ========================================
-- Verification Queries
-- ========================================

-- Check organizations table
SELECT 
  name,
  subscription_status,
  subscription_tier,
  trial_ends_at,
  owner_id IS NOT NULL as has_owner
FROM organizations;

-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('branches', 'zones', 'audits', 'users', 'organizations');

-- Count policies
SELECT schemaname, tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('branches', 'zones', 'audits')
GROUP BY schemaname, tablename;

-- ========================================
-- Success Message
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '✅ Multi-tenancy schema update complete!';
  RAISE NOTICE '✅ Organizations table enhanced with subscription fields';
  RAISE NOTICE '✅ Super admin tracking tables created';
  RAISE NOTICE '✅ RLS policies updated for data isolation';
  RAISE NOTICE '📋 Next: Run npm run dev:web and test organization switching';
END $$;

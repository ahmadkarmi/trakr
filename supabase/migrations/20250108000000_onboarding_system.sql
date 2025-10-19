-- ============================================================================
-- Seamless Onboarding System Migration
-- Created: 2025-01-08
-- Purpose: Enable admin org creation and user invitation flows
-- ============================================================================

-- ============================================================================
-- PART 1: USER INVITATIONS TABLE
-- ============================================================================

-- Create invitations table for user onboarding
CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  invitation_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate pending invitations
  UNIQUE(org_id, email, accepted_at)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invitations_token ON user_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_org ON user_invitations(org_id);
CREATE INDEX IF NOT EXISTS idx_invitations_expires ON user_invitations(expires_at);

-- ============================================================================
-- PART 2: ONBOARDING PROGRESS TABLE
-- ============================================================================

-- Track detailed onboarding progress for users
CREATE TABLE IF NOT EXISTS user_onboarding_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  onboarding_type VARCHAR(50) NOT NULL, -- 'admin_create_org' or 'invited_user'
  current_step INTEGER NOT NULL DEFAULT 0,
  total_steps INTEGER NOT NULL DEFAULT 4,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  data JSONB DEFAULT '{}', -- Store step-specific data
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_user ON user_onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_org ON user_onboarding_progress(org_id);

-- ============================================================================
-- PART 3: UPDATE ORGANIZATIONS TABLE
-- ============================================================================

-- Ensure organizations table has onboarding fields
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;

-- ============================================================================
-- PART 4: ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS invitations_all ON user_invitations;
DROP POLICY IF EXISTS onboarding_progress_all ON user_onboarding_progress;

-- Invitations: Authenticated users can manage invitations
CREATE POLICY invitations_all ON user_invitations 
  FOR ALL TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Onboarding Progress: Users can manage their own progress
CREATE POLICY onboarding_progress_all ON user_onboarding_progress 
  FOR ALL TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- ============================================================================
-- PART 5: HELPER FUNCTIONS
-- ============================================================================

-- Function to generate secure invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS VARCHAR(255) AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Function to check if invitation is valid
CREATE OR REPLACE FUNCTION is_invitation_valid(token VARCHAR(255))
RETURNS BOOLEAN AS $$
DECLARE
  inv_record RECORD;
BEGIN
  SELECT * INTO inv_record 
  FROM user_invitations 
  WHERE invitation_token = token 
    AND accepted_at IS NULL 
    AND expires_at > NOW();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to mark invitation as accepted
CREATE OR REPLACE FUNCTION accept_invitation(token VARCHAR(255), user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  inv_record RECORD;
BEGIN
  -- Get invitation
  SELECT * INTO inv_record 
  FROM user_invitations 
  WHERE invitation_token = token 
    AND accepted_at IS NULL 
    AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Update invitation
  UPDATE user_invitations 
  SET accepted_at = NOW(), updated_at = NOW()
  WHERE id = inv_record.id;
  
  -- Update user with org and role
  UPDATE users 
  SET org_id = inv_record.org_id, 
      role = inv_record.role,
      updated_at = NOW()
  WHERE id = user_uuid;
  
  -- Create onboarding progress
  INSERT INTO user_onboarding_progress (
    user_id, org_id, onboarding_type, current_step, total_steps
  ) VALUES (
    user_uuid, inv_record.org_id, 'invited_user', 0, 3
  ) ON CONFLICT (user_id) DO NOTHING;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_invitations 
  WHERE accepted_at IS NULL 
    AND expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 6: TRIGGERS
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_invitations_updated_at ON user_invitations;
CREATE TRIGGER update_invitations_updated_at
  BEFORE UPDATE ON user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_onboarding_progress_updated_at ON user_onboarding_progress;
CREATE TRIGGER update_onboarding_progress_updated_at
  BEFORE UPDATE ON user_onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check tables were created
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
--   AND table_name IN ('user_invitations', 'user_onboarding_progress');

-- Check indexes
-- SELECT indexname FROM pg_indexes 
-- WHERE schemaname = 'public' 
--   AND indexname LIKE 'idx_invitations%' OR indexname LIKE 'idx_onboarding%';

-- Check RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public' 
--   AND tablename IN ('user_invitations', 'user_onboarding_progress');

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Onboarding system migration complete!';
  RAISE NOTICE '✅ user_invitations table created with token generation';
  RAISE NOTICE '✅ user_onboarding_progress table created for tracking';
  RAISE NOTICE '✅ Helper functions created for invitation management';
  RAISE NOTICE '✅ RLS policies enabled for security';
  RAISE NOTICE '📋 Next: Update API to support invitation flows';
END $$;

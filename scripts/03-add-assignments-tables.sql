-- ========================================
-- STEP 3: Add Assignment Tables
-- Branch Manager Assignments & Auditor Assignments
-- ========================================

-- ===================================
-- Branch Manager Assignments Table
-- ===================================
CREATE TABLE IF NOT EXISTS branch_manager_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(branch_id, manager_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_branch_manager_assignments_branch_id ON branch_manager_assignments(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_manager_assignments_manager_id ON branch_manager_assignments(manager_id);

COMMENT ON TABLE branch_manager_assignments IS 'Multiple branch managers can be assigned to a single branch';
COMMENT ON COLUMN branch_manager_assignments.branch_id IS 'The branch being managed';
COMMENT ON COLUMN branch_manager_assignments.manager_id IS 'The manager assigned to this branch';
COMMENT ON COLUMN branch_manager_assignments.assigned_by IS 'User who created this assignment';

-- ===================================
-- Auditor Assignments Table
-- ===================================
CREATE TABLE IF NOT EXISTS auditor_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  branch_ids UUID[] DEFAULT '{}',
  zone_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_auditor_assignments_user_id ON auditor_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_auditor_assignments_branch_ids ON auditor_assignments USING GIN(branch_ids);
CREATE INDEX IF NOT EXISTS idx_auditor_assignments_zone_ids ON auditor_assignments USING GIN(zone_ids);

COMMENT ON TABLE auditor_assignments IS 'Auditor assignments to branches and zones';
COMMENT ON COLUMN auditor_assignments.user_id IS 'The auditor being assigned';
COMMENT ON COLUMN auditor_assignments.branch_ids IS 'Array of branch IDs this auditor can audit';
COMMENT ON COLUMN auditor_assignments.zone_ids IS 'Array of zone IDs this auditor can audit';

-- ===================================
-- RLS Policies
-- ===================================

-- Enable RLS
ALTER TABLE branch_manager_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditor_assignments ENABLE ROW LEVEL SECURITY;

-- Branch Manager Assignments Policies
-- Allow admins and super admins to manage assignments
CREATE POLICY "Admins can view all branch manager assignments"
  ON branch_manager_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Admins can insert branch manager assignments"
  ON branch_manager_assignments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Admins can delete branch manager assignments"
  ON branch_manager_assignments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- Branch managers can view their own assignments
CREATE POLICY "Branch managers can view their own assignments"
  ON branch_manager_assignments
  FOR SELECT
  USING (
    auth.uid() = manager_id
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'BRANCH_MANAGER'
    )
  );

-- Auditor Assignments Policies
-- Allow admins and super admins to manage auditor assignments
CREATE POLICY "Admins can view all auditor assignments"
  ON auditor_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER')
    )
  );

CREATE POLICY "Admins can manage auditor assignments"
  ON auditor_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER')
    )
  );

-- Auditors can view their own assignments
CREATE POLICY "Auditors can view their own assignments"
  ON auditor_assignments
  FOR SELECT
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'AUDITOR'
    )
  );

-- ===================================
-- Trigger for updated_at
-- ===================================

-- Branch Manager Assignments
CREATE OR REPLACE FUNCTION update_branch_manager_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_branch_manager_assignments_updated_at
  BEFORE UPDATE ON branch_manager_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_branch_manager_assignments_updated_at();

-- Auditor Assignments
CREATE OR REPLACE FUNCTION update_auditor_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_auditor_assignments_updated_at
  BEFORE UPDATE ON auditor_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_auditor_assignments_updated_at();

-- ===================================
-- Success Message
-- ===================================
DO $$
BEGIN
  RAISE NOTICE '✅ Assignment tables created successfully!';
  RAISE NOTICE '📋 Tables: branch_manager_assignments, auditor_assignments';
  RAISE NOTICE '🔒 RLS policies enabled';
  RAISE NOTICE '⚡ Indexes and triggers created';
END $$;

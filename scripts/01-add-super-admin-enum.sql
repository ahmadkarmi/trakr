-- ========================================
-- STEP 1: Add SUPER_ADMIN to enum
-- Run this FIRST, then wait for it to complete
-- ========================================

-- Add SUPER_ADMIN to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

-- Verify it was added
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
ORDER BY enumlabel;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ SUPER_ADMIN enum value added!';
  RAISE NOTICE '📋 Next: Run 02-add-saas-schema.sql';
END $$;

-- Test Script: Verify rejection data preservation
-- Run this after deploying the migration to verify it works correctly

-- This script tests the complete workflow:
-- 1. Audit is submitted
-- 2. Manager rejects it
-- 3. Auditor resubmits
-- 4. Manager approves it
-- 5. Verify BOTH rejection AND approval data are preserved

-- Test setup (assumes you have a test audit)
DO $$
DECLARE
  v_test_audit_id UUID;
  v_manager_id UUID;
  v_result RECORD;
BEGIN
  -- Get a test audit ID (replace with actual audit ID)
  -- SELECT id INTO v_test_audit_id FROM audits WHERE status = 'SUBMITTED' LIMIT 1;
  
  -- Get a manager user ID (replace with actual manager ID)
  -- SELECT id INTO v_manager_id FROM auth.users WHERE email LIKE '%manager%' LIMIT 1;
  
  RAISE NOTICE 'To test this migration:';
  RAISE NOTICE '1. Find an audit ID: SELECT id FROM audits WHERE status = ''SUBMITTED'' LIMIT 1;';
  RAISE NOTICE '2. Find a manager ID: SELECT id FROM auth.users LIMIT 1;';
  RAISE NOTICE '3. Run the test commands below with actual IDs';
END $$;

-- Example test commands (replace UUIDs with actual values):

-- Step 1: Reject the audit
-- SELECT * FROM set_audit_approval(
--   'audit-uuid-here',
--   'rejected',
--   'manager-uuid-here',
--   'Please add more photos'
-- );

-- Step 2: Verify rejection data saved
-- SELECT 
--   id, status, 
--   rejected_by, rejected_at, rejection_note,
--   approved_by, approved_at, approval_note
-- FROM audits 
-- WHERE id = 'audit-uuid-here';
-- Expected: status = REJECTED, rejection fields populated, approval fields NULL

-- Step 3: Approve the audit (after auditor resubmits)
-- SELECT * FROM set_audit_approval(
--   'audit-uuid-here',
--   'approved',
--   'manager-uuid-here',
--   'Looks good now'
-- );

-- Step 4: CRITICAL TEST - Verify BOTH rejection AND approval data preserved
-- SELECT 
--   id, 
--   status,
--   -- Rejection data (should still exist!)
--   rejected_by,
--   rejected_at,
--   rejection_note,
--   -- Approval data (new)
--   approved_by,
--   approved_at,
--   approval_note
-- FROM audits 
-- WHERE id = 'audit-uuid-here';

-- Expected result:
-- status: APPROVED
-- rejected_by: [manager-uuid] ✅ PRESERVED
-- rejected_at: [timestamp] ✅ PRESERVED
-- rejection_note: 'Please add more photos' ✅ PRESERVED
-- approved_by: [manager-uuid] ✅ NEW
-- approved_at: [timestamp] ✅ NEW
-- approval_note: 'Looks good now' ✅ NEW

-- SUCCESS CRITERIA:
-- ✅ Status is APPROVED
-- ✅ Rejection fields are NOT NULL (preserved)
-- ✅ Approval fields are populated (new)
-- ✅ Both pieces of history visible in one record

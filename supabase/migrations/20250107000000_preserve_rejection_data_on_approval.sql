-- Migration: Preserve rejection data when approving previously rejected audits
-- Issue: When audit is rejected then approved, rejection history was being deleted
-- Fix: Keep rejection fields when approving (don't set to NULL)
-- Compliance: Maintains full audit trail for regulatory requirements

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS set_audit_approval(UUID, TEXT, UUID, TEXT, TEXT, TEXT, TEXT);

-- Create improved function that preserves rejection data
CREATE OR REPLACE FUNCTION set_audit_approval(
  p_audit_id UUID,
  p_status TEXT,
  p_user_id UUID,
  p_note TEXT DEFAULT NULL,
  p_signature_url TEXT DEFAULT NULL,
  p_signature_type TEXT DEFAULT NULL,
  p_approval_name TEXT DEFAULT NULL
)
RETURNS audits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit audits;
BEGIN
  -- Validate status parameter
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be approved or rejected', p_status;
  END IF;

  -- Handle approval
  IF p_status = 'approved' THEN
    UPDATE audits SET
      status = 'APPROVED',
      approved_by = p_user_id,
      approved_at = NOW(),
      approval_note = p_note,
      approval_signature = p_signature_url,
      signature_type = p_signature_type,
      approval_name = p_approval_name,
      updated_at = NOW()
      -- CRITICAL FIX: Do NOT clear rejection fields
      -- Keep: rejected_by, rejected_at, rejection_note
      -- This preserves full audit trail when audit is rejected then approved
    WHERE id = p_audit_id
    RETURNING * INTO v_audit;
    
  -- Handle rejection
  ELSIF p_status = 'rejected' THEN
    UPDATE audits SET
      status = 'REJECTED',
      rejected_by = p_user_id,
      rejected_at = NOW(),
      rejection_note = p_note,
      updated_at = NOW()
      -- CRITICAL FIX: Do NOT clear approval fields
      -- Keep: approved_by, approved_at, approval_note, approval_signature
      -- This preserves history if audit was previously approved then rejected
    WHERE id = p_audit_id
    RETURNING * INTO v_audit;
  END IF;
  
  -- Check if update was successful
  IF v_audit IS NULL THEN
    RAISE EXCEPTION 'Audit not found: %', p_audit_id;
  END IF;
  
  RETURN v_audit;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION set_audit_approval TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION set_audit_approval IS 
'Sets audit approval or rejection status while preserving full audit trail. 
Does not clear previous approval/rejection data to maintain compliance and accountability.';

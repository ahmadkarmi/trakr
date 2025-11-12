-- Create function to handle audit approvals/rejections
CREATE OR REPLACE FUNCTION public.set_audit_approval(
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
AS $$
DECLARE
  v_audit audits;
BEGIN
  -- Update audit based on approval/rejection
  IF p_status = 'approved' THEN
    UPDATE audits
    SET 
      status = 'APPROVED',
      approved_by = p_user_id,
      approved_at = NOW(),
      approval_note = p_note,
      approval_signature_url = p_signature_url,
      approval_signature_type = p_signature_type,
      approval_name = p_approval_name,
      updated_at = NOW()
    WHERE id = p_audit_id
      AND status = 'SUBMITTED'
    RETURNING * INTO v_audit;
    
  ELSIF p_status = 'rejected' THEN
    UPDATE audits
    SET 
      status = 'REJECTED',
      rejected_by = p_user_id,
      rejected_at = NOW(),
      rejection_note = p_note,
      updated_at = NOW()
    WHERE id = p_audit_id
      AND status = 'SUBMITTED'
    RETURNING * INTO v_audit;
    
  ELSE
    RAISE EXCEPTION 'Invalid approval status: %', p_status;
  END IF;

  -- Check if update was successful
  IF v_audit.id IS NULL THEN
    RAISE EXCEPTION 'Audit must be in SUBMITTED status to approve/reject';
  END IF;

  RETURN v_audit;
END;
$$;;

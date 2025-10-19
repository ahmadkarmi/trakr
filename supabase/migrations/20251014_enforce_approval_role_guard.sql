-- Enforce: only branch managers assigned to the branch or admins can approve/reject audits.
-- Also block the assigned auditor from approving/rejecting their own audit.

DROP FUNCTION IF EXISTS set_audit_approval(UUID, TEXT, UUID, TEXT, TEXT, TEXT, TEXT);

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
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be approved or rejected', p_status;
  END IF;

  SELECT * INTO v_audit FROM audits WHERE id = p_audit_id;
  IF v_audit IS NULL THEN
    RAISE EXCEPTION 'Audit not found: %', p_audit_id;
  END IF;

  -- Authorization: only admins (same org) or branch managers assigned to this branch
  IF NOT (
    (is_admin() AND v_audit.org_id = my_org_id()) OR
    EXISTS (
      SELECT 1 FROM public.branch_manager_assignments a
      WHERE a.branch_id = v_audit.branch_id AND a.manager_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Only a branch manager assigned to this branch or an admin can % this audit', p_status
      USING ERRCODE = '42501';
  END IF;

  -- Prevent auditors from approving/rejecting their own audits
  IF v_audit.assigned_to = auth.uid() THEN
    RAISE EXCEPTION 'Auditors cannot % their own audit', p_status
      USING ERRCODE = '42501';
  END IF;

  -- Apply status change while preserving prior approval/rejection fields
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
      -- Preserve existing rejection fields
    WHERE id = p_audit_id
    RETURNING * INTO v_audit;

  ELSIF p_status = 'rejected' THEN
    UPDATE audits SET
      status = 'REJECTED',
      rejected_by = p_user_id,
      rejected_at = NOW(),
      rejection_note = p_note,
      updated_at = NOW()
      -- Preserve existing approval fields
    WHERE id = p_audit_id
    RETURNING * INTO v_audit;
  END IF;

  IF v_audit IS NULL THEN
    RAISE EXCEPTION 'Audit update failed for: %', p_audit_id;
  END IF;

  RETURN v_audit;
END;
$$;

GRANT EXECUTE ON FUNCTION set_audit_approval TO authenticated;

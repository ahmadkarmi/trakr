-- ================================================
-- COMPREHENSIVE RLS REFACTOR - PART 4: AUDITS
-- ================================================
-- Most complex table with role-specific logic
-- ================================================

-- Drop existing policies
DROP POLICY IF EXISTS audits_select_policy ON public.audits;
DROP POLICY IF EXISTS audits_insert_policy ON public.audits;
DROP POLICY IF EXISTS audits_update_policy ON public.audits;
DROP POLICY IF EXISTS audits_delete_policy ON public.audits;

-- ================================================
-- AUDITS SELECT POLICY
-- ================================================
CREATE POLICY audits_select_policy
ON public.audits
FOR SELECT
TO authenticated
USING (
  -- Super admins see everything
  is_super_admin()
  OR (
    -- Must be in same org
    org_id = current_user_org_id()
    AND (
      -- Admins see all audits in their org
      current_user_role() = 'ADMIN'
      -- Branch managers see audits for branches they manage
      OR (
        current_user_role() = 'BRANCH_MANAGER'
        AND branch_id = ANY(user_managed_branch_ids())
      )
      -- Auditors see only their own audits
      OR (
        current_user_role() = 'AUDITOR'
        AND assigned_to = current_user_id()
      )
    )
  )
);

-- ================================================
-- AUDITS INSERT POLICY
-- ================================================
CREATE POLICY audits_insert_policy
ON public.audits
FOR INSERT
TO authenticated
WITH CHECK (
  -- Super admins can insert anywhere
  is_super_admin()
  OR (
    -- Must be in same org
    org_id = current_user_org_id()
    AND (
      -- Admins can create audits in their org
      current_user_role() = 'ADMIN'
      -- Auditors can create audits for branches they're assigned to
      OR (
        current_user_role() = 'AUDITOR'
        AND branch_id = ANY(user_assigned_branch_ids())
        AND assigned_to = current_user_id()
      )
    )
  )
);

-- ================================================
-- AUDITS UPDATE POLICY  
-- ================================================
CREATE POLICY audits_update_policy
ON public.audits
FOR UPDATE
TO authenticated
USING (
  -- Super admins can update anything
  is_super_admin()
  OR (
    -- Must be in same org
    org_id = current_user_org_id()
    AND (
      -- Admins can update all audits (admin override for approved/submitted)
      current_user_role() = 'ADMIN'
      -- Branch managers can update audits for review (approve/reject)
      OR (
        current_user_role() = 'BRANCH_MANAGER'
        AND branch_id = ANY(user_managed_branch_ids())
        -- Managers can update SUBMITTED audits to approve/reject them
        AND status IN ('SUBMITTED', 'APPROVED', 'REJECTED')
      )
      -- Auditors can update their own audits in specific states
      OR (
        current_user_role() = 'AUDITOR'
        AND assigned_to = current_user_id()
        -- Auditors can only edit DRAFT, IN_PROGRESS, COMPLETED, or REJECTED audits
        AND status IN ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'REJECTED')
      )
    )
  )
)
WITH CHECK (
  -- Same conditions for the new state
  is_super_admin()
  OR (
    org_id = current_user_org_id()
    AND (
      current_user_role() = 'ADMIN'
      OR (
        current_user_role() = 'BRANCH_MANAGER'
        AND branch_id = ANY(user_managed_branch_ids())
      )
      OR (
        current_user_role() = 'AUDITOR'
        AND assigned_to = current_user_id()
      )
    )
  )
);

-- ================================================
-- AUDITS DELETE POLICY
-- ================================================
CREATE POLICY audits_delete_policy
ON public.audits
FOR DELETE
TO authenticated
USING (
  -- Super admins can delete anything
  is_super_admin()
  OR (
    -- Must be in same org
    org_id = current_user_org_id()
    AND (
      -- Admins can delete audits in their org
      current_user_role() = 'ADMIN'
      -- Auditors can delete only their own DRAFT audits
      OR (
        current_user_role() = 'AUDITOR'
        AND assigned_to = current_user_id()
        AND status = 'DRAFT'
      )
    )
  )
);

-- ================================================
-- AUDIT_PHOTOS TABLE (child of audits)
-- ================================================

-- Drop existing policies
DROP POLICY IF EXISTS audit_photos_select_policy ON public.audit_photos;
DROP POLICY IF EXISTS audit_photos_insert_policy ON public.audit_photos;
DROP POLICY IF EXISTS audit_photos_update_policy ON public.audit_photos;
DROP POLICY IF EXISTS audit_photos_delete_policy ON public.audit_photos;

-- SELECT: Can see photos if can see parent audit
CREATE POLICY audit_photos_select_policy
ON public.audit_photos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.audits a
    WHERE a.id = audit_photos.audit_id
      AND (
        is_super_admin()
        OR (
          a.org_id = current_user_org_id()
          AND (
            current_user_role() IN ('ADMIN', 'SUPER_ADMIN')
            OR (current_user_role() = 'BRANCH_MANAGER' AND a.branch_id = ANY(user_managed_branch_ids()))
            OR (current_user_role() = 'AUDITOR' AND a.assigned_to = current_user_id())
          )
        )
      )
  )
);

-- INSERT: Can insert photos if can edit parent audit
CREATE POLICY audit_photos_insert_policy
ON public.audit_photos
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.audits a
    WHERE a.id = audit_photos.audit_id
      AND (
        is_super_admin()
        OR (
          a.org_id = current_user_org_id()
          AND (
            current_user_role() = 'ADMIN'
            OR (current_user_role() = 'AUDITOR' AND a.assigned_to = current_user_id() AND a.status IN ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'))
          )
        )
      )
  )
);

-- UPDATE: Can update photos if can edit parent audit  
CREATE POLICY audit_photos_update_policy
ON public.audit_photos
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.audits a
    WHERE a.id = audit_photos.audit_id
      AND (
        is_super_admin()
        OR (a.org_id = current_user_org_id() AND current_user_role() = 'ADMIN')
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.audits a
    WHERE a.id = audit_photos.audit_id
      AND (
        is_super_admin()
        OR (a.org_id = current_user_org_id() AND current_user_role() = 'ADMIN')
      )
  )
);

-- DELETE: Can delete photos if can edit parent audit
CREATE POLICY audit_photos_delete_policy
ON public.audit_photos
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.audits a
    WHERE a.id = audit_photos.audit_id
      AND (
        is_super_admin()
        OR (
          a.org_id = current_user_org_id()
          AND (
            current_user_role() = 'ADMIN'
            OR (current_user_role() = 'AUDITOR' AND a.assigned_to = current_user_id() AND a.status IN ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'))
          )
        )
      )
  )
);
;

# Critical Backend Fix Required: Preserve Rejection Data

**Priority:** 🔴 **HIGH** - Audit Trail Compliance Issue  
**Type:** Database Function Modification  
**Affected:** `supabase/functions/set_audit_approval` RPC

---

## 🐛 **The Problem**

When an audit is **rejected** then later **approved**, the rejection history is **DELETED**:

```sql
-- Current behavior in set_audit_approval when status = 'approved':
UPDATE audits SET
  status = 'APPROVED',
  approved_by = p_user_id,
  approved_at = NOW(),
  approval_note = p_note,
  approval_signature = p_signature_url,
  signature_type = p_signature_type,
  approval_name = p_approval_name,
  rejected_by = NULL,        -- ❌ LOST!
  rejected_at = NULL,        -- ❌ LOST!
  rejection_note = NULL      -- ❌ LOST!
WHERE id = p_audit_id;
```

### **Impact:**
- **Compliance Risk:** Loss of audit trail
- **Accountability:** Can't see who rejected and why
- **History:** Incomplete workflow tracking
- **Legal:** Potential regulatory issues

---

## ✅ **The Fix**

**DON'T** clear rejection fields when approving. Keep both rejection AND approval data.

### **Modified SQL Function:**

```sql
-- Location: supabase/migrations/[timestamp]_fix_rejection_data_preservation.sql

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
AS $$
DECLARE
  v_audit audits;
BEGIN
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
      -- ✅ DON'T clear: rejected_by, rejected_at, rejection_note
    WHERE id = p_audit_id
    RETURNING * INTO v_audit;
    
  ELSIF p_status = 'rejected' THEN
    UPDATE audits SET
      status = 'REJECTED',
      rejected_by = p_user_id,
      rejected_at = NOW(),
      rejection_note = p_note,
      updated_at = NOW()
      -- ✅ DON'T clear: approved_by, approved_at, approval_note, approval_signature
      --    (in case previously approved then rejected again)
    WHERE id = p_audit_id
    RETURNING * INTO v_audit;
    
  ELSE
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;
  
  RETURN v_audit;
END;
$$;
```

---

## 📋 **Implementation Steps**

### **1. Create Migration File**

```bash
# In supabase directory
cd supabase/migrations
touch $(date +%Y%m%d%H%M%S)_fix_rejection_data_preservation.sql
```

### **2. Add Migration Content**

Copy the SQL function above into the migration file.

### **3. Test Locally**

```bash
# Reset local database
supabase db reset

# Apply migrations
supabase db push

# Test the workflow:
# 1. Create audit
# 2. Submit for approval
# 3. Reject with reason
# 4. Resubmit
# 5. Approve
# 6. Verify both rejection AND approval data exists
```

### **4. Verify Data Retention**

```sql
-- After approval of previously rejected audit:
SELECT 
  id,
  status,
  -- Rejection data (should still exist)
  rejected_by,
  rejected_at,
  rejection_note,
  -- Approval data (new)
  approved_by,
  approved_at,
  approval_note
FROM audits
WHERE id = '[audit-id]';

-- Expected result:
-- status: APPROVED
-- rejected_by: [manager-uuid] ✅ (preserved)
-- rejected_at: [timestamp] ✅ (preserved)
-- rejection_note: "needs more detail" ✅ (preserved)
-- approved_by: [manager-uuid] ✅ (new)
-- approved_at: [timestamp] ✅ (new)
-- approval_note: "looks good now" ✅ (new)
```

### **5. Deploy to Production**

```bash
# Push to Supabase production
supabase db push --linked

# Or via Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Paste the CREATE OR REPLACE FUNCTION query
# 3. Run
```

---

## 🧪 **Testing Checklist**

- [ ] Create audit as auditor
- [ ] Submit for approval
- [ ] Reject as manager with reason "needs more photos"
- [ ] Verify rejection data saved
- [ ] Edit audit as auditor
- [ ] Resubmit for approval
- [ ] Approve as manager with reason "good now"
- [ ] **Verify BOTH rejection AND approval data exists**
- [ ] Check activity log shows both events
- [ ] Verify frontend displays complete history

---

## 📊 **Expected Behavior**

### **Before Fix:**
```
Audit Workflow:
1. Submit → SUBMITTED ✓
2. Reject → rejected_by, rejected_at, rejection_note saved ✓
3. Resubmit → SUBMITTED ✓
4. Approve → rejected_by = NULL, rejected_at = NULL, rejection_note = NULL ❌
```

### **After Fix:**
```
Audit Workflow:
1. Submit → SUBMITTED ✓
2. Reject → rejected_by, rejected_at, rejection_note saved ✓
3. Resubmit → SUBMITTED ✓
4. Approve → rejected_by, rejected_at, rejection_note PRESERVED ✓
            approved_by, approved_at, approval_note added ✓
```

---

## 🎯 **Benefits**

✅ **Complete Audit Trail:** All decisions preserved  
✅ **Accountability:** Can see who rejected and why, even after approval  
✅ **Compliance:** Meets regulatory requirements for record keeping  
✅ **History:** Full workflow visible in activity logs  
✅ **Transparency:** Managers and auditors can review full history

---

## ⚠️ **Important Notes**

1. **No Data Loss:** This fix prevents future data loss, but doesn't recover already lost data
2. **Backward Compatible:** Existing audits work fine, just preserves more data going forward
3. **Activity Logs:** Frontend already shows both events if data exists
4. **UI Impact:** No frontend changes needed - just displays preserved data

---

## 🔗 **Related Files**

- **Backend:** `supabase/migrations/[timestamp]_fix_rejection_data_preservation.sql` (TO CREATE)
- **Frontend:** `apps/web/src/screens/AuditSummary.tsx` (already displays history)
- **API:** `apps/web/src/utils/supabaseApi.ts` (calls the RPC, no changes needed)

---

**Status:** 📝 **DOCUMENTED - AWAITING IMPLEMENTATION**

**Next Steps:**
1. Create migration file
2. Test locally
3. Deploy to production
4. Verify with end-to-end test

---

**Created:** 2025-10-07  
**Issue Reference:** AUDIT_WORKFLOW_SIMULATION.md - Issue #2

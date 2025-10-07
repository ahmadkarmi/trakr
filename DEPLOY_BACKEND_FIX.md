# Deploy Backend Fix - Step by Step Guide

**Fix:** Preserve rejection data when approving audits  
**Migration:** `20250107000000_preserve_rejection_data_on_approval.sql`  
**Priority:** 🔴 **CRITICAL** - Audit Trail Compliance

---

## 📋 **Pre-Deployment Checklist**

- [ ] Backend fix tested locally (optional)
- [ ] Frontend validation fixes deployed
- [ ] Backup of current database (recommended)
- [ ] Supabase CLI installed (or use dashboard)

---

## 🚀 **Deployment Options**

### **Option 1: Supabase CLI (Recommended)**

#### **Step 1: Check Supabase Connection**
```bash
cd d:\Dev\Apps\Trakr

# Check if linked to project
supabase status

# If not linked, link to your project
supabase link --project-ref your-project-ref
```

#### **Step 2: Review Migration**
```bash
# View the migration file
cat supabase/migrations/20250107000000_preserve_rejection_data_on_approval.sql
```

#### **Step 3: Apply Migration**
```bash
# Apply to local database (for testing)
supabase db reset

# Push to production
supabase db push
```

#### **Step 4: Verify Deployment**
```bash
# Check function exists
supabase db execute "SELECT proname FROM pg_proc WHERE proname = 'set_audit_approval';"
```

---

### **Option 2: Supabase Dashboard (Alternative)**

#### **Step 1: Open SQL Editor**
1. Go to https://app.supabase.com
2. Select your project
3. Navigate to **SQL Editor**
4. Click **New Query**

#### **Step 2: Copy Migration SQL**
```bash
# Copy the migration file content
cat supabase/migrations/20250107000000_preserve_rejection_data_on_approval.sql
```

Or open: `d:\Dev\Apps\Trakr\supabase\migrations\20250107000000_preserve_rejection_data_on_approval.sql`

#### **Step 3: Execute Migration**
1. Paste the SQL into the editor
2. Click **Run** or press `Ctrl+Enter`
3. Verify success message appears

#### **Step 4: Verify Function Created**
Run this query:
```sql
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc 
WHERE proname = 'set_audit_approval';
```

Should return the function definition with the fix.

---

## 🧪 **Testing the Fix**

### **Automated Test (After Deployment)**

1. **Get Test Data:**
```sql
-- Find a submitted audit
SELECT id, status FROM audits WHERE status = 'SUBMITTED' LIMIT 1;

-- Find a manager user
SELECT id, email FROM auth.users WHERE email LIKE '%manager%' LIMIT 1;
```

2. **Test Rejection:**
```sql
-- Replace with actual UUIDs
SELECT * FROM set_audit_approval(
  'your-audit-id'::UUID,
  'rejected',
  'your-manager-id'::UUID,
  'Please add more photos'
);
```

3. **Verify Rejection Saved:**
```sql
SELECT 
  status,
  rejected_by,
  rejected_at,
  rejection_note
FROM audits 
WHERE id = 'your-audit-id';
```

Expected: Status = REJECTED, rejection fields populated

4. **Test Approval (Critical Test):**
```sql
-- First, change status back to SUBMITTED (simulate resubmission)
UPDATE audits SET status = 'SUBMITTED' WHERE id = 'your-audit-id';

-- Now approve it
SELECT * FROM set_audit_approval(
  'your-audit-id'::UUID,
  'approved',
  'your-manager-id'::UUID,
  'Looks good now'
);
```

5. **VERIFY BOTH DATA PRESERVED:**
```sql
SELECT 
  status,
  -- Rejection data (MUST still exist!)
  rejected_by,
  rejected_at,
  rejection_note,
  -- Approval data (new)
  approved_by,
  approved_at,
  approval_note
FROM audits 
WHERE id = 'your-audit-id';
```

**✅ SUCCESS IF:**
- Status = APPROVED
- rejected_by IS NOT NULL (preserved! ✅)
- rejected_at IS NOT NULL (preserved! ✅)
- rejection_note = 'Please add more photos' (preserved! ✅)
- approved_by IS NOT NULL (new! ✅)
- approved_at IS NOT NULL (new! ✅)
- approval_note = 'Looks good now' (new! ✅)

**❌ FAILURE IF:**
- rejected_by IS NULL (data was cleared - fix didn't work)

---

## 🔍 **Verification Commands**

### **Check Function Exists:**
```sql
SELECT COUNT(*) FROM pg_proc WHERE proname = 'set_audit_approval';
-- Should return: 1
```

### **View Function Code:**
```sql
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'set_audit_approval';
-- Should show the updated function with preservation logic
```

### **Check for "Do NOT clear" Comment:**
```sql
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'set_audit_approval'
  AND pg_get_functiondef(oid) LIKE '%Do NOT clear%';
-- Should return the function (confirms it has the fix)
```

---

## 🎯 **Expected Behavior After Fix**

### **Before Fix:**
```
Workflow:
1. Submit → SUBMITTED ✓
2. Reject → rejected_by, rejected_at, rejection_note saved ✓
3. Resubmit → SUBMITTED ✓
4. Approve → rejected_* fields = NULL ❌ (DATA LOST!)
```

### **After Fix:**
```
Workflow:
1. Submit → SUBMITTED ✓
2. Reject → rejected_by, rejected_at, rejection_note saved ✓
3. Resubmit → SUBMITTED ✓
4. Approve → rejected_* fields PRESERVED ✅
            approved_* fields added ✅
            
Full audit trail maintained! ✅
```

---

## ⚠️ **Important Notes**

1. **No Data Recovery:** This fix prevents FUTURE data loss, but doesn't recover already lost data
2. **Backward Compatible:** Existing audits work fine, just preserves more data going forward
3. **Frontend Ready:** UI already displays preserved data (no changes needed)
4. **Compliance:** Meets regulatory requirements for complete audit trails

---

## 🚨 **Rollback (If Needed)**

If something goes wrong, you can rollback by recreating the old function:

```sql
-- Rollback: Recreate old function (with data clearing - not recommended!)
-- Only use if absolutely necessary

DROP FUNCTION IF EXISTS set_audit_approval;

-- (Then restore from backup or previous migration)
```

**Better approach:** Fix the issue rather than rollback, as rollback loses the compliance benefit.

---

## ✅ **Post-Deployment Checklist**

- [ ] Migration executed successfully
- [ ] Function exists in database
- [ ] Test workflow completed (reject → approve)
- [ ] Verified rejection data preserved
- [ ] Frontend still works correctly
- [ ] Activity logs show both events
- [ ] No errors in production logs

---

## 📞 **Troubleshooting**

### **Issue: "Function already exists" error**
```sql
-- Drop and recreate
DROP FUNCTION IF EXISTS set_audit_approval(UUID, TEXT, UUID, TEXT, TEXT, TEXT, TEXT);
-- Then run the migration again
```

### **Issue: "Permission denied"**
```sql
-- Grant permissions
GRANT EXECUTE ON FUNCTION set_audit_approval TO authenticated;
```

### **Issue: Rejection data still clearing**
```sql
-- Check function code
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'set_audit_approval';
-- Verify it does NOT contain lines setting rejected_* to NULL
```

---

## 🎉 **Success Confirmation**

Once deployed and tested successfully:

1. ✅ Function updated in database
2. ✅ Test workflow passes
3. ✅ Rejection data preserved
4. ✅ Full audit trail maintained
5. ✅ Compliance requirements met

**Your audit workflow is now production-ready with full audit trail!** 🚀

---

**Deployment Time:** ~5 minutes  
**Risk Level:** Low (backward compatible)  
**Impact:** High (compliance & audit trail)

---

**Ready to deploy!** Follow the steps above and verify with the tests. 🎯

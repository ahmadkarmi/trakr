-- ========================================
-- ACTIONABLE NOTIFICATIONS - APPLY THIS
-- ========================================
-- 
-- This adds persistent notifications that require action
-- Red dot stays until manager approves/rejects (not just reads)
--
-- Instructions:
-- 1. Go to: https://prxvzfrjpzoguwqbpchj.supabase.co/project/_/sql
-- 2. Copy ALL the SQL below (lines 12-35)
-- 3. Paste into SQL Editor
-- 4. Click RUN button
-- 5. Should see "Success. 0 rows returned" (or number of updated rows)
-- ========================================

ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS requires_action BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS action_type TEXT,
ADD COLUMN IF NOT EXISTS action_completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notifications_requires_action 
  ON notifications(user_id, requires_action) 
  WHERE requires_action = TRUE AND action_completed_at IS NULL;

UPDATE notifications 
SET requires_action = true, 
    action_type = 'REVIEW_AUDIT'
WHERE type = 'AUDIT_SUBMITTED' 
  AND action_completed_at IS NULL;

COMMENT ON COLUMN notifications.requires_action IS 
  'If true, notification persists until related action is completed (not just read)';

COMMENT ON COLUMN notifications.action_type IS 
  'Type of action required: REVIEW_AUDIT, COMPLETE_TASK, etc.';

COMMENT ON COLUMN notifications.action_completed_at IS 
  'Timestamp when the required action was completed, auto-dismisses notification';

-- ========================================
-- DONE! Notifications now persist until action taken
-- ========================================

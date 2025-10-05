-- Add fields to track actionable notifications
-- Actionable notifications require an action (approve/reject) to be dismissed
-- They won't be marked as read just by clicking, only when the action is completed

ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS requires_action BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS action_type TEXT,
ADD COLUMN IF NOT EXISTS action_completed_at TIMESTAMPTZ;

-- Create index for querying actionable notifications
CREATE INDEX IF NOT EXISTS idx_notifications_requires_action 
  ON notifications(user_id, requires_action) 
  WHERE requires_action = TRUE AND action_completed_at IS NULL;

-- Update existing audit submitted notifications to require action
UPDATE notifications 
SET requires_action = true, 
    action_type = 'REVIEW_AUDIT'
WHERE type = 'AUDIT_SUBMITTED' 
  AND action_completed_at IS NULL;

-- Add comment explaining the new fields
COMMENT ON COLUMN notifications.requires_action IS 
  'If true, notification persists until related action is completed (not just read)';

COMMENT ON COLUMN notifications.action_type IS 
  'Type of action required: REVIEW_AUDIT, COMPLETE_TASK, etc.';

COMMENT ON COLUMN notifications.action_completed_at IS 
  'Timestamp when the required action was completed, auto-dismisses notification';

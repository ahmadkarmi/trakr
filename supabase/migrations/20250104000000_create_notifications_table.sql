-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  related_id TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- System/service role can create notifications for any user
CREATE POLICY "Service role can create notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT, UPDATE, DELETE ON notifications TO authenticated;
GRANT INSERT ON notifications TO service_role;

-- Add comment
COMMENT ON TABLE notifications IS 'Stores user notifications for audit lifecycle events';

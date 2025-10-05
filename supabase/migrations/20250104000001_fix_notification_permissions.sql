-- Fix notification creation permissions
-- Allow authenticated users to create notifications for any user
-- This is needed so auditors can notify managers and vice versa

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Service role can create notifications" ON notifications;

-- Create new policy allowing authenticated users to create notifications
CREATE POLICY "Authenticated users can create notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Grant INSERT permission to authenticated users
GRANT INSERT ON notifications TO authenticated;

-- Add comment explaining the change
COMMENT ON POLICY "Authenticated users can create notifications" ON notifications IS 
  'Allows authenticated users (auditors, managers, admins) to create notifications for other users during audit lifecycle events';

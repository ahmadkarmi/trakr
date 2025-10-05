-- ========================================
-- NOTIFICATION FIX - COPY AND RUN THIS
-- ========================================
-- 
-- Instructions:
-- 1. Go to: https://prxvzfrjpzoguwqbpchj.supabase.co/project/_/sql
-- 2. Copy ALL the SQL below (lines 10-21)
-- 3. Paste into SQL Editor
-- 4. Click RUN button
-- 5. Should see "Success. No rows returned"
-- ========================================

DROP POLICY IF EXISTS "Service role can create notifications" ON notifications;

CREATE POLICY "Authenticated users can create notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

GRANT INSERT ON notifications TO authenticated;

-- ========================================
-- DONE! Now test by submitting an audit
-- ========================================

/**
 * Script to apply notification permissions fix to Supabase
 * Run: node scripts/apply-notification-fix.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv/config')

const MIGRATION_SQL = `
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
`

async function applyMigration() {
  console.log('🔧 Applying notification permissions fix...\n')
  
  // Get environment variables
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl) {
    console.error('❌ Error: VITE_SUPABASE_URL not found in environment')
    console.error('   Make sure apps/web/.env.local exists with Supabase credentials')
    process.exit(1)
  }
  
  if (!supabaseServiceKey) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY not found in environment')
    console.error('   You need the service role key (not anon key) to run migrations')
    console.error('\n   How to get it:')
    console.error('   1. Go to https://supabase.com/dashboard')
    console.error('   2. Select your project')
    console.error('   3. Go to Settings → API')
    console.error('   4. Copy "service_role" key (secret)')
    console.error('   5. Add to apps/web/.env.local: SUPABASE_SERVICE_ROLE_KEY=your-key')
    process.exit(1)
  }
  
  console.log('📡 Connecting to Supabase...')
  console.log(`   URL: ${supabaseUrl}\n`)
  
  // Create Supabase client with service role
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  
  try {
    console.log('📝 Executing migration SQL...')
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: MIGRATION_SQL })
    
    if (error) {
      // If exec_sql doesn't exist, try direct query
      console.log('   Trying alternative approach...')
      const { error: queryError } = await supabase.from('notifications').select('id').limit(1)
      
      if (queryError) {
        throw queryError
      }
      
      console.log('\n⚠️  Direct SQL execution requires manual application')
      console.log('\n📋 Please run this SQL in Supabase Dashboard → SQL Editor:')
      console.log('=' .repeat(60))
      console.log(MIGRATION_SQL)
      console.log('=' .repeat(60))
      console.log('\n🔗 Go to: https://supabase.com/dashboard → Your Project → SQL Editor')
      return
    }
    
    console.log('✅ Migration applied successfully!\n')
    console.log('🔔 Notification system is now configured correctly')
    console.log('   - Authenticated users can create notifications')
    console.log('   - Auditors can notify branch managers')
    console.log('   - Managers can notify auditors\n')
    console.log('🧪 Test the fix:')
    console.log('   1. Submit an audit as auditor')
    console.log('   2. Check branch manager notifications (bell icon)')
    console.log('   3. Approve/reject as manager')
    console.log('   4. Check auditor notifications\n')
    
  } catch (err) {
    console.error('\n❌ Error applying migration:', err.message)
    console.log('\n📋 Please apply manually in Supabase Dashboard → SQL Editor:')
    console.log('=' .repeat(60))
    console.log(MIGRATION_SQL)
    console.log('=' .repeat(60))
    console.log('\n🔗 Go to: https://supabase.com/dashboard → Your Project → SQL Editor')
    process.exit(1)
  }
}

applyMigration()

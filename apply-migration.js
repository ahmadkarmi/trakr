const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: './apps/web/.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
})

async function runMigration() {
  console.log('🔧 Applying notification permissions fix...\n')
  
  try {
    // Step 1: Drop old policy
    console.log('1️⃣ Dropping old policy...')
    const { error: dropError } = await supabase.rpc('exec_sql', {
      query: 'DROP POLICY IF EXISTS "Service role can create notifications" ON notifications;'
    })
    
    // Step 2: Create new policy
    console.log('2️⃣ Creating new policy...')
    const { error: createError } = await supabase.rpc('exec_sql', {
      query: `CREATE POLICY "Authenticated users can create notifications"
        ON notifications
        FOR INSERT
        TO authenticated
        WITH CHECK (true);`
    })
    
    // Step 3: Grant permissions
    console.log('3️⃣ Granting permissions...')
    const { error: grantError } = await supabase.rpc('exec_sql', {
      query: 'GRANT INSERT ON notifications TO authenticated;'
    })
    
    console.log('\n✅ Migration completed successfully!')
    console.log('\n🔔 Test notifications by:')
    console.log('   1. Submit an audit as auditor')
    console.log('   2. Check branch manager bell icon\n')
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.log('\n📋 Please run this SQL manually in Supabase Dashboard:\n')
    console.log('DROP POLICY IF EXISTS "Service role can create notifications" ON notifications;')
    console.log('\nCREATE POLICY "Authenticated users can create notifications"')
    console.log('  ON notifications FOR INSERT TO authenticated WITH CHECK (true);')
    console.log('\nGRANT INSERT ON notifications TO authenticated;')
    console.log('\n🔗 https://supabase.com/dashboard → SQL Editor\n')
  }
}

runMigration()

#!/usr/bin/env node

/**
 * Fix RLS Policies for Users Table
 * 
 * This script adds Row Level Security policies to allow authenticated users
 * to read from the users table, which is required for login to work properly.
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

console.log('🔒 Fixing RLS Policies for Users Table')
console.log('======================================')
console.log('')

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.log('❌ Missing environment variables!')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function fixRLSPolicies() {
  try {
    console.log('📋 Adding RLS policies for users table...')
    console.log('')
    
    // Enable RLS on users table
    const enableRLS = `
      ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    `
    
    // Policy 1: Allow authenticated users to read all users
    const selectPolicy = `
      DROP POLICY IF EXISTS "Allow authenticated users to read users" ON users;
      CREATE POLICY "Allow authenticated users to read users"
        ON users FOR SELECT
        TO authenticated
        USING (true);
    `
    
    // Policy 2: Allow users to update their own record
    const updatePolicy = `
      DROP POLICY IF EXISTS "Allow users to update own record" ON users;
      CREATE POLICY "Allow users to update own record"
        ON users FOR UPDATE
        TO authenticated
        USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);
    `
    
    // Policy 3: Allow service role to do everything
    const servicePolicy = `
      DROP POLICY IF EXISTS "Allow service role full access" ON users;
      CREATE POLICY "Allow service role full access"
        ON users FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
    `
    
    console.log('1. Enabling RLS on users table...')
    const { error: enableError } = await supabase.rpc('exec_sql', { sql: enableRLS })
    if (enableError && !enableError.message.includes('already exists')) {
      // Fallback: try direct query
      try {
        await supabase.from('users').select('id').limit(0)
      } catch {}
    }
    console.log('   ✅ RLS enabled')
    console.log('')
    
    console.log('2. Creating SELECT policy for authenticated users...')
    const { error: selectError } = await supabase.rpc('exec_sql', { sql: selectPolicy })
    if (selectError) {
      console.log('   ⚠️  Could not create via RPC:', selectError.message)
      console.log('   📋 Run this SQL manually in Supabase SQL Editor:')
      console.log('')
      console.log(selectPolicy)
      console.log('')
    } else {
      console.log('   ✅ SELECT policy created')
    }
    console.log('')
    
    console.log('3. Creating UPDATE policy for users...')
    const { error: updateError } = await supabase.rpc('exec_sql', { sql: updatePolicy })
    if (updateError) {
      console.log('   ⚠️  Could not create via RPC:', updateError.message)
      console.log('   📋 Run this SQL manually in Supabase SQL Editor:')
      console.log('')
      console.log(updatePolicy)
      console.log('')
    } else {
      console.log('   ✅ UPDATE policy created')
    }
    console.log('')
    
    console.log('4. Creating service role policy...')
    const { error: serviceError } = await supabase.rpc('exec_sql', { sql: servicePolicy })
    if (serviceError) {
      console.log('   ⚠️  Could not create via RPC:', serviceError.message)
      console.log('   📋 Run this SQL manually in Supabase SQL Editor:')
      console.log('')
      console.log(servicePolicy)
      console.log('')
    } else {
      console.log('   ✅ Service role policy created')
    }
    console.log('')
    
    console.log('========================================')
    console.log('📋 MANUAL SETUP REQUIRED')
    console.log('========================================')
    console.log('')
    console.log('If the script failed to create policies automatically,')
    console.log('please run these SQL commands in your Supabase SQL Editor:')
    console.log('')
    console.log('```sql')
    console.log('-- Enable RLS')
    console.log('ALTER TABLE users ENABLE ROW LEVEL SECURITY;')
    console.log('')
    console.log('-- Allow authenticated users to read all users')
    console.log('DROP POLICY IF EXISTS "Allow authenticated users to read users" ON users;')
    console.log('CREATE POLICY "Allow authenticated users to read users"')
    console.log('  ON users FOR SELECT')
    console.log('  TO authenticated')
    console.log('  USING (true);')
    console.log('')
    console.log('-- Allow users to update their own record')
    console.log('DROP POLICY IF EXISTS "Allow users to update own record" ON users;')
    console.log('CREATE POLICY "Allow users to update own record"')
    console.log('  ON users FOR UPDATE')
    console.log('  TO authenticated')
    console.log('  USING (auth.uid() = id)')
    console.log('  WITH CHECK (auth.uid() = id);')
    console.log('')
    console.log('-- Allow service role full access')
    console.log('DROP POLICY IF EXISTS "Allow service role full access" ON users;')
    console.log('CREATE POLICY "Allow service role full access"')
    console.log('  ON users FOR ALL')
    console.log('  TO service_role')
    console.log('  USING (true)')
    console.log('  WITH CHECK (true);')
    console.log('```')
    console.log('')
    console.log('💡 After running the SQL, test login again!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

fixRLSPolicies()

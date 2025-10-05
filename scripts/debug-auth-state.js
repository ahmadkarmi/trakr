#!/usr/bin/env node

/**
 * Debug Auth State - Shows the current state of auth users vs database users
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

console.log('🔍 Debugging Auth State')
console.log('======================')
console.log('')

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.log('❌ Missing environment variables!')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function debugAuthState() {
  try {
    // Get auth users
    console.log('📋 Auth Users (from auth.users):')
    console.log('================================')
    const { data: authData } = await supabase.auth.admin.listUsers()
    
    const authUsers = authData.users.filter(u => u.email.includes('trakr.com'))
    authUsers.forEach(u => {
      console.log(`  ${u.email}`)
      console.log(`    ID: ${u.id}`)
      console.log(`    Created: ${new Date(u.created_at).toLocaleString()}`)
      console.log('')
    })
    
    // Get database users
    console.log('📋 Database Users (from users table):')
    console.log('======================================')
    const { data: dbUsers } = await supabase
      .from('users')
      .select('*')
      .ilike('email', '%trakr.com%')
      .order('email')
    
    if (!dbUsers || dbUsers.length === 0) {
      console.log('  ❌ NO USERS FOUND IN DATABASE!')
      console.log('')
      console.log('  This is the problem! The users table is empty or missing @trakr.com users.')
      console.log('  Solution: Run npm run seed:db')
      return
    }
    
    dbUsers.forEach(u => {
      console.log(`  ${u.email}`)
      console.log(`    ID: ${u.id}`)
      console.log(`    Role: ${u.role}`)
      console.log(`    Org ID: ${u.org_id}`)
      console.log('')
    })
    
    // Compare
    console.log('🔍 Comparison:')
    console.log('==============')
    
    for (const authUser of authUsers) {
      const dbUser = dbUsers.find(u => u.email === authUser.email)
      
      if (!dbUser) {
        console.log(`  ❌ ${authUser.email}`)
        console.log(`     EXISTS in auth but NOT in database`)
        console.log('')
      } else if (authUser.id !== dbUser.id) {
        console.log(`  ⚠️  ${authUser.email}`)
        console.log(`     Auth ID: ${authUser.id}`)
        console.log(`     DB ID:   ${dbUser.id}`)
        console.log(`     IDs DO NOT MATCH - This will cause login issues!`)
        console.log('')
      } else {
        console.log(`  ✅ ${authUser.email}`)
        console.log(`     IDs match: ${authUser.id}`)
        console.log('')
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

debugAuthState()

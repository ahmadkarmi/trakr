#!/usr/bin/env node

/**
 * Sync Supabase Auth User IDs with Database User IDs
 * 
 * This script ensures that user IDs in the `users` table match the auth.users IDs
 * in Supabase, which is required for authentication to work properly.
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

console.log('🔄 Syncing Auth IDs with Database User IDs')
console.log('===========================================')
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

async function syncAuthIds() {
  try {
    // 1. Get all auth users
    console.log('📋 Fetching auth users from Supabase Auth...')
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.log('❌ Failed to fetch auth users:', authError.message)
      return
    }
    
    console.log(`✅ Found ${authData.users.length} users in auth`)
    console.log('')
    
    // 2. Get all database users
    console.log('📋 Fetching users from database...')
    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('*')
      .order('email')
    
    if (dbError) {
      console.log('❌ Failed to fetch database users:', dbError.message)
      return
    }
    
    console.log(`✅ Found ${dbUsers.length} users in database`)
    console.log('')
    
    // 3. Match and update IDs
    console.log('🔄 Matching auth users with database users...')
    console.log('')
    
    let updated = 0
    let skipped = 0
    let failed = 0
    
    for (const dbUser of dbUsers) {
      const authUser = authData.users.find(u => u.email === dbUser.email)
      
      if (!authUser) {
        console.log(`⚠️  No auth user found for: ${dbUser.email}`)
        skipped++
        continue
      }
      
      if (dbUser.id === authUser.id) {
        console.log(`✓ Already synced: ${dbUser.email}`)
        skipped++
        continue
      }
      
      // Update database user ID to match auth user ID
      const { error: updateError } = await supabase
        .from('users')
        .update({ id: authUser.id })
        .eq('id', dbUser.id)
      
      if (updateError) {
        console.log(`❌ Failed to update ${dbUser.email}: ${updateError.message}`)
        failed++
        continue
      }
      
      console.log(`✅ Updated ${dbUser.email}: ${dbUser.id} → ${authUser.id}`)
      updated++
    }
    
    console.log('')
    console.log('========================================')
    console.log('📊 Summary:')
    console.log(`✅ Updated: ${updated} users`)
    console.log(`⏭️  Skipped: ${skipped} users (already synced or no auth user)`)
    console.log(`❌ Failed: ${failed} users`)
    console.log('')
    
    if (updated > 0) {
      console.log('🎉 User IDs synced successfully!')
      console.log('💡 You can now log in with email/password')
    } else {
      console.log('ℹ️  All users already synced or no changes needed')
    }
    console.log('')
    
  } catch (error) {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }
}

syncAuthIds().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})

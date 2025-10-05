#!/usr/bin/env node

/**
 * Test User Fetch - Simulates what the app does after login
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

console.log('🔍 Testing User Fetch (simulating app behavior)')
console.log('================================================')
console.log('')

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.log('❌ Missing environment variables!')
  console.log('Need: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testUserFetch() {
  try {
    // Step 1: Login
    console.log('Step 1: Logging in with admin@trakr.com...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@trakr.com',
      password: 'Password@123'
    })
    
    if (authError) {
      console.log('❌ Login failed:', authError.message)
      return
    }
    
    console.log('✅ Login successful!')
    console.log(`   Auth User ID: ${authData.user.id}`)
    console.log(`   Email: ${authData.user.email}`)
    console.log('')
    
    // Step 2: Fetch user by ID (like the app does)
    console.log('Step 2: Fetching user profile by ID...')
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle()
    
    if (userError) {
      console.log('❌ User fetch failed:', userError.message)
      console.log('   Error details:', JSON.stringify(userError, null, 2))
      console.log('')
      console.log('⚠️  This is likely an RLS (Row Level Security) policy issue!')
      console.log('   The auth user can\'t read from the users table.')
      return
    }
    
    if (!userData) {
      console.log('❌ User not found in database!')
      console.log('   Auth ID:', authData.user.id)
      console.log('')
      console.log('⚠️  The user exists in auth but not in the database!')
      return
    }
    
    console.log('✅ User profile fetched successfully!')
    console.log('   Database User:', JSON.stringify(userData, null, 2))
    console.log('')
    
    // Step 3: Fetch all users (alternative method the app tries)
    console.log('Step 3: Fetching all users (fallback method)...')
    const { data: allUsers, error: allUsersError } = await supabase
      .from('users')
      .select('*')
    
    if (allUsersError) {
      console.log('❌ Fetch all users failed:', allUsersError.message)
      console.log('')
      console.log('⚠️  RLS policy is blocking SELECT queries on users table!')
      console.log('   Need to add policy: authenticated users can read users table')
      return
    }
    
    console.log(`✅ Fetched ${allUsers?.length || 0} users`)
    console.log('')
    
    console.log('🎉 SUCCESS! Authentication and user fetch working correctly!')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

testUserFetch()

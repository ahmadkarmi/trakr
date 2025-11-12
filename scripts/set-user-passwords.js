#!/usr/bin/env node

/**
 * Set Passwords for All Seeded Users
 * 
 * This script uses the Supabase Admin API to set passwords for all seeded users.
 * Requires SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.
 */

const { createClient } = require('@supabase/supabase-js')
const { ensureEnvSet, formatMissing } = require('./utils/env')

const { resolved: envVars, missing: missingEnv, usedKeys } = ensureEnvSet('scripts')

if (missingEnv.length > 0) {
  console.log('❌ Missing environment variables!')
  console.log('Please set:')
  console.log(formatMissing(missingEnv))
  console.log('\nYou can set them via shell exports or by creating a .env file in the project root.')
  process.exit(1)
}

const SUPABASE_URL = envVars.SUPABASE_URL
const SUPABASE_SERVICE_KEY = envVars.SUPABASE_SERVICE_KEY

console.log('🔐 Setting Passwords for Seeded Users')
console.log('=====================================')
console.log('')

if (usedKeys.SUPABASE_SERVICE_KEY && usedKeys.SUPABASE_SERVICE_KEY !== 'SUPABASE_SERVICE_KEY') {
  console.log('⚠️  Using fallback key for SUPABASE_SERVICE_KEY (' + usedKeys.SUPABASE_SERVICE_KEY + '). Operations may be limited.')
}

// Create Supabase admin client (uses service role key)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Default password (you can change this)
const DEFAULT_PASSWORD = 'Password@123'

// We'll fetch all users from the database dynamically
let SEEDED_USERS = []

async function setPasswordForUser(email, password) {
  try {
    // Get user by email from our users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single()

    if (userError || !userData) {
      console.log(`⚠️  User not found in database: ${email}`)
      return false
    }

    // First, try to get the existing auth user
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers?.users.find(u => u.email === email)
    
    if (existingUser) {
      // User exists in auth, update their password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { password: password }
      )
      
      if (updateError) {
        console.log(`❌ Failed to update password for ${email}: ${updateError.message}`)
        return false
      }
      
      console.log(`✅ Updated password for: ${email}`)
      return true
    } else {
      // User doesn't exist in auth, create them
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          password_set_by_script: true,
          password_set_at: new Date().toISOString()
        }
      })

      if (authError) {
        console.log(`❌ Failed to create auth user for ${email}: ${authError.message}`)
        return false
      }

      console.log(`✅ Created auth user with password: ${email}`)
      return true
    }
  } catch (error) {
    console.log(`❌ Error processing ${email}: ${error.message}`)
    return false
  }
}

async function getAllUsersFromDatabase() {
  console.log('📋 Fetching all users from database...')
  const { data: users, error } = await supabase
    .from('users')
    .select('email, role')
    .order('email')
  
  if (error) {
    console.log(`❌ Failed to fetch users: ${error.message}`)
    return []
  }
  
  console.log(`✅ Found ${users.length} users in database:`)
  users.forEach(user => {
    console.log(`   - ${user.email} (${user.role})`)
  })
  console.log('')
  
  return users.map(u => u.email)
}

async function setAllPasswords() {
  // First, get all users from the database
  SEEDED_USERS = await getAllUsersFromDatabase()
  
  if (SEEDED_USERS.length === 0) {
    console.log('❌ No users found in database. Please run seed:db first.')
    return
  }

  console.log(`📋 Setting password for ${SEEDED_USERS.length} users...`)
  console.log(`🔑 Default password: ${DEFAULT_PASSWORD}`)
  console.log('')

  let successCount = 0
  let failCount = 0

  for (const email of SEEDED_USERS) {
    const success = await setPasswordForUser(email, DEFAULT_PASSWORD)
    if (success) {
      successCount++
    } else {
      failCount++
    }
  }

  console.log('')
  console.log('========================================')
  console.log('📊 Summary:')
  console.log(`✅ Successfully set: ${successCount} users`)
  console.log(`❌ Failed: ${failCount} users`)
  console.log('')
  console.log('🔐 Login Credentials:')
  console.log('   Email: Any of the emails above')
  console.log(`   Password: ${DEFAULT_PASSWORD}`)
  console.log('')
  console.log('💡 You can now use email/password login in the app!')
  console.log('   Or continue using the role-based login buttons.')
  console.log('')
}

setAllPasswords().catch(error => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})

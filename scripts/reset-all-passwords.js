#!/usr/bin/env node

/**
 * Reset All User Passwords to Password@123
 * 
 * This script:
 * 1. Updates existing auth users with the default password
 * 2. Creates auth accounts for database users that don't have them
 * 3. Links the auth accounts to the database users via auth_user_id
 */

const { createClient } = require('@supabase/supabase-js')
const { ensureEnvSet, formatMissing } = require('./utils/env')

const { resolved: envVars, missing: missingEnv } = ensureEnvSet('scripts')

if (missingEnv.length > 0) {
  console.log('❌ Missing environment variables!')
  console.log('Please set:')
  console.log(formatMissing(missingEnv))
  process.exit(1)
}

const SUPABASE_URL = envVars.SUPABASE_URL
const SUPABASE_SERVICE_KEY = envVars.SUPABASE_SERVICE_KEY
const DEFAULT_PASSWORD = 'Password@123'

console.log('🔐 Resetting All User Passwords')
console.log('================================')
console.log('')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function resetUserPassword(user) {
  const { email, id: userId, auth_user_id } = user
  
  try {
    // Check if user has an auth account
    const { data: allAuthUsers } = await supabase.auth.admin.listUsers()
    const existingAuthUser = allAuthUsers?.users.find(u => u.email === email)
    
    if (existingAuthUser) {
      // Update existing auth user password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingAuthUser.id,
        { password: DEFAULT_PASSWORD }
      )
      
      if (updateError) {
        console.log(`❌ ${email}: Failed to update password - ${updateError.message}`)
        return false
      }
      
      // Ensure auth_user_id is set in database
      if (!auth_user_id || auth_user_id !== existingAuthUser.id) {
        const { error: dbError } = await supabase
          .from('users')
          .update({ auth_user_id: existingAuthUser.id })
          .eq('id', userId)
        
        if (dbError) {
          console.log(`⚠️  ${email}: Password updated but failed to link auth_user_id - ${dbError.message}`)
        } else {
          console.log(`✅ ${email}: Password updated and auth_user_id linked`)
        }
      } else {
        console.log(`✅ ${email}: Password updated`)
      }
      
      return true
    } else {
      // Create new auth user
      const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: {
          created_by_reset_script: true,
          created_at: new Date().toISOString()
        }
      })
      
      if (createError) {
        console.log(`❌ ${email}: Failed to create auth user - ${createError.message}`)
        return false
      }
      
      // Link the new auth user to the database user
      const { error: linkError } = await supabase
        .from('users')
        .update({ auth_user_id: newAuthUser.user.id })
        .eq('id', userId)
      
      if (linkError) {
        console.log(`⚠️  ${email}: Auth user created but failed to link - ${linkError.message}`)
        // Try to clean up the orphaned auth user
        await supabase.auth.admin.deleteUser(newAuthUser.user.id)
        return false
      }
      
      console.log(`✅ ${email}: Auth user created and linked`)
      return true
    }
  } catch (error) {
    console.log(`❌ ${email}: Error - ${error.message}`)
    return false
  }
}

async function main() {
  // Fetch all users from database
  console.log('📋 Fetching users from database...')
  const { data: users, error: fetchError } = await supabase
    .from('users')
    .select('id, email, role, auth_user_id')
    .order('email')
  
  if (fetchError) {
    console.log(`❌ Failed to fetch users: ${fetchError.message}`)
    process.exit(1)
  }
  
  if (!users || users.length === 0) {
    console.log('❌ No users found in database')
    process.exit(1)
  }
  
  console.log(`✅ Found ${users.length} users`)
  console.log('')
  console.log('🔑 Resetting passwords to: Password@123')
  console.log('')
  
  let successCount = 0
  let failCount = 0
  
  for (const user of users) {
    const success = await resetUserPassword(user)
    if (success) {
      successCount++
    } else {
      failCount++
    }
  }
  
  console.log('')
  console.log('========================================')
  console.log('📊 Summary:')
  console.log(`✅ Successfully reset: ${successCount} users`)
  console.log(`❌ Failed: ${failCount} users`)
  console.log('')
  console.log('🔐 All users can now login with:')
  console.log('   Email: [their email address]')
  console.log('   Password: Password@123')
  console.log('')
}

main().catch(error => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.E2E_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.E2E_SUPABASE_SERVICE_KEY
const newPassword = process.env.NEW_PASSWORD || 'Password@123'

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   SUPABASE_URL (or E2E_SUPABASE_URL)')
  console.error('   SUPABASE_SERVICE_KEY (or E2E_SUPABASE_SERVICE_KEY)')
  console.error('')
  console.error('Usage:')
  console.error('   SUPABASE_URL="your-url" SUPABASE_SERVICE_KEY="your-service-key" node scripts/set-user-passwords.mjs')
  process.exit(1)
}

// Create admin client with service role key
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const defaultUsers = [
  'admin@trakr.com',
  'branchmanager@trakr.com', 
  'auditor@trakr.com'
]

async function setUserPasswords() {
  console.log('🔐 Setting user passwords...')
  console.log(`📧 Target users: ${defaultUsers.join(', ')}`)
  console.log(`🔑 New password: ${newPassword}`)
  console.log('')

  let successCount = 0
  let errorCount = 0

  for (const email of defaultUsers) {
    try {
      console.log(`⏳ Setting password for ${email}...`)
      
      // First, get all users and find by email
      const { data: usersData, error: listError } = await supabase.auth.admin.listUsers()
      
      if (listError) {
        throw listError
      }

      const user = usersData.users.find(u => u.email === email)
      
      if (!user) {
        console.log(`⚠️  User ${email} not found in auth system`)
        errorCount++
        continue
      }

      // Update user password using the correct user ID
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: newPassword }
      )

      if (updateError) {
        throw updateError
      }

      console.log(`✅ Password set for ${email}`)
      successCount++
      
    } catch (err) {
      console.log(`❌ Failed to set password for ${email}: ${err.message}`)
      errorCount++
    }
  }

  console.log('')
  console.log('📊 Summary:')
  console.log(`   ✅ Success: ${successCount}`)
  console.log(`   ❌ Errors: ${errorCount}`)
  
  if (successCount > 0) {
    console.log('')
    console.log('🎉 Password update completed!')
    console.log('💡 Users can now log in with:')
    console.log(`   📧 Email: admin@trakr.com, branchmanager@trakr.com, auditor@trakr.com`)
    console.log(`   🔑 Password: ${newPassword}`)
  }

  if (errorCount > 0) {
    process.exit(1)
  }
}

// Run the script
setUserPasswords().catch(err => {
  console.error('💥 Script failed:', err.message)
  process.exit(1)
})

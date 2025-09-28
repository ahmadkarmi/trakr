// Quick test script to check authentication
import { createClient } from '@supabase/supabase-js'

const url = 'https://prxvzfrjpzoguwqbpchj.supabase.co'
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByeHZ6ZnJqcHpvZ3V3cWJwY2hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NjYwMDYsImV4cCI6MjA3NDI0MjAwNn0.7ImQGlRWARq6Am9gfO4rsOXzRgM4Ew4AbY5eQSkEE4o'

const supabase = createClient(url, anonKey)

async function testAuth() {
  console.log('Testing authentication...')
  
  // Test 1: Check if users exist
  try {
    const { data: users, error } = await supabase.from('users').select('*')
    if (error) {
      console.error('Error fetching users:', error)
    } else {
      console.log('Users found:', users.length)
      users.forEach(user => {
        console.log(`- ${user.email} (${user.role})`)
      })
    }
  } catch (e) {
    console.error('Failed to fetch users:', e)
  }
  
  // Test 2: Try to sign in with admin@trakr.com
  try {
    console.log('\nTesting sign in with admin@trakr.com...')
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@trakr.com',
      password: 'password123' // Common test password
    })
    
    if (error) {
      console.error('Auth error:', error.message)
    } else {
      console.log('Auth success:', data.user?.email)
    }
  } catch (e) {
    console.error('Auth failed:', e)
  }
}

testAuth()

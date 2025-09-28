import { createClient } from '@supabase/supabase-js'

const url = process.env.URL
const anon = process.env.ANON
const email = process.env.EMAIL
const password = process.env.PASSWORD

if (!url || !anon || !email || !password) {
  console.error('Missing env: URL, ANON, EMAIL, PASSWORD')
  process.exit(1)
}

const supa = createClient(url, anon, { auth: { persistSession: false } })
const { data, error } = await supa.auth.signInWithPassword({ email, password })
if (error) {
  console.error('Error:', error.message)
  process.exit(1)
}
console.log('OK user:', data.user?.id)

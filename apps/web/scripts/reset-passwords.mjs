const base = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '')
const url = base + '/functions/v1/set-passwords'
const anon = process.env.SUPABASE_ANON_KEY
const password = process.env.NEW_PASSWORD || 'Password@12345'

if (!url || !anon) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY')
  process.exit(1)
}

const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${anon}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ password }),
})

const text = await res.text()
console.log('Status:', res.status)
console.log(text)
if (!res.ok) process.exit(1)

const base = (process.env.URL || '').trim().replace(/\/+$/, '')
const anon = process.env.ANON
const email = process.env.EMAIL
const password = process.env.PASSWORD

if (!base || !anon || !email || !password) {
  console.error('Missing env. Need URL, ANON, EMAIL, PASSWORD')
  process.exit(1)
}

const url = base + '/auth/v1/token?grant_type=password'
const res = await fetch(url, {
  method: 'POST',
  headers: {
    'apikey': anon,
    'Authorization': `Bearer ${anon}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ email, password })
})

console.log('Status:', res.status)
console.log(await res.text())
if (!res.ok) process.exit(1)

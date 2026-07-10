#!/usr/bin/env node
/**
 * Synthetic uptime checks: run via GitHub Actions or locally.
 * Requires Node 18+ (global fetch available).
 */

const LOGIN_URL = process.env.SYNTHETIC_LOGIN_URL || 'https://trakr-mobile.vercel.app/login'
const SUPABASE_URL = process.env.SYNTHETIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SYNTHETIC_SUPABASE_ANON_KEY

const results = []

async function checkLogin() {
  const res = await fetch(LOGIN_URL, {
    headers: {
      'User-Agent': 'Trakr-Uptime/1.0',
    },
  })
  const body = await res.text()
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`)
  }
  // The app is a client-rendered SPA: the server response is the shell, so
  // assert what the server actually delivers - the app title and a built
  // bundle reference. (The old check grepped for client-rendered login text,
  // which the shell can never contain, so it failed on every run.)
  if (!body.includes('<title>Trakr')) {
    throw new Error('App shell title missing')
  }
  if (!/src="\/assets\/[^"]+\.js"/.test(body)) {
    throw new Error('Built bundle script tag missing from shell')
  }
  return `login shell ok (${res.status})`
}

async function checkSupabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return 'supabase check skipped (missing env)'
  }
  const endpoint = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/organizations?select=id&limit=1`
  const res = await fetch(endpoint, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'User-Agent': 'Trakr-Uptime/1.0',
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase rest error ${res.status}: ${text}`)
  }
  const data = await res.json()
  if (!Array.isArray(data)) {
    throw new Error('Supabase response not array')
  }
  return `supabase ok (${data.length} org rows visible)`
}

async function run() {
  const checks = [
    { name: 'Web Login', fn: checkLogin },
    { name: 'Supabase Org query', fn: checkSupabase },
  ]
  let failures = 0
  for (const check of checks) {
    try {
      const message = await check.fn()
      results.push({ name: check.name, status: 'ok', message })
      console.log(`✅ ${check.name}: ${message}`)
    } catch (err) {
      failures += 1
      results.push({ name: check.name, status: 'error', error: err.message })
      console.error(`❌ ${check.name}:`, err.message)
    }
  }

  if (failures > 0) {
    console.error(`Synthetic checks failed (${failures}/${checks.length}).`)
    process.exit(1)
  } else {
    console.log('All synthetic checks passed.')
  }
}

run().catch((err) => {
  console.error('Unexpected failure', err)
  process.exit(1)
})

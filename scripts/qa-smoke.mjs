// Visual smoke test against the "Trakr QA Sandbox" org (see seed-qa-org.mjs).
// Logs in as each of the three QA accounts, screenshots their main screens to
// test-results/qa-smoke/, and reports uncaught page/console errors.
//
// NOTE: React error-boundary crashes are INVISIBLE to pageerror/console
// monitoring (the error is caught, the page shows "Page failed to load").
// Always inspect the screenshots — an empty error list alone proves nothing.
//
// Usage: npm run qa:smoke   (dev server must be running; QA_BASE_URL overrides)
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BASE_URL = process.env.QA_BASE_URL || 'http://localhost:3002'
const SHOT_DIR = 'test-results/qa-smoke'
const PASSWORD = 'QaTest@12345'

mkdirSync(SHOT_DIR, { recursive: true })

async function loginEmail(page, email) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', PASSWORD)
  await page.getByRole('button', { name: /Sign in|Log in/i }).click()
  await page.waitForURL(url => url.pathname.includes('/dashboard'), { timeout: 30_000 })
}

const CASES = [
  { email: 'qa.admin@trakr-test.dev', path: '/analytics', shot: 'admin-analytics' },
  { email: 'qa.manager@trakr-test.dev', path: '/analytics', shot: 'branchmanager-analytics' },
  { email: 'qa.auditor@trakr-test.dev', path: null, shot: 'auditor-dashboard' },
]

async function run() {
  const browser = await chromium.launch()
  const results = []

  for (const c of CASES) {
    const page = await browser.newPage()
    const errors = []
    page.on('pageerror', (err) => errors.push(String(err)))
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })

    await loginEmail(page, c.email)
    await page.waitForTimeout(1000)
    if (c.path) {
      await page.goto(`${BASE_URL}${c.path}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(1000)
      // Reload once: a fresh Vite dev server can drop the very first Supabase
      // fetch while modules compile on demand; the second load is stable.
      await page.reload({ waitUntil: 'networkidle' })
    }
    // Drop login/cold-start noise, then give the settled page a window in
    // which any steady-state errors can surface before we snapshot.
    errors.length = 0
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${SHOT_DIR}/${c.shot}.png`, fullPage: true })
    results.push({ account: c.email, screenshot: `${SHOT_DIR}/${c.shot}.png`, errors: [...errors] })
    await page.close()
  }

  await browser.close()
  console.log(JSON.stringify(results, null, 2))
}

run().catch((err) => { console.error('FAILED:', err); process.exit(1) })

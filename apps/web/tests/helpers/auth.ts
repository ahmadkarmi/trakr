import { Page } from '@playwright/test'

/**
 * Handle onboarding screen if it appears after login.
 * Completes org creation for admin users without orgId.
 * Skips user onboarding (requires invitation token).
 */
export async function handleOnboardingIfNeeded(page: Page) {
  try {
    // Check for admin onboarding (Welcome heading)
    const welcomeHeading = page.getByRole('heading', { name: /Welcome/i })
    if (await welcomeHeading.isVisible({ timeout: 2_000 })) {
      console.log('🔧 Detected admin onboarding - completing org creation')
      await page.fill('input[id="orgName"]', 'Test Organization')
      await page.getByRole('button', { name: /Create Organization/i }).click()
      await page.waitForURL(url => url.pathname.includes('/dashboard'), { timeout: 30_000 })
      return
    }
    
    // Check for user onboarding (invitation required)
    const invitationError = page.getByText(/No invitation token/i)
    if (await invitationError.isVisible({ timeout: 2_000 })) {
      console.log('⚠️ User onboarding detected - requires invitation token. User may not have orgId in database.')
      // This shouldn't happen in tests if database is properly seeded
      throw new Error('User redirected to onboarding but no invitation token. Check database seeding.')
    }
  } catch (e: any) {
    // Onboarding not needed or already completed
    if (e.message?.includes('invitation token')) {
      throw e // Re-throw to fail the test
    }
  }
}

/**
 * Login as admin user (handles both role button and email/password).
 * Auto-completes onboarding if user doesn't have orgId.
 */
export async function loginAsAdmin(page: Page) {
  // Navigate to page first, THEN clear storage
  await page.goto('/login')
  await page.context().clearCookies()
  
  //  Aggressively clear ALL storage (zustand persist uses localStorage)
  await page.evaluate(() => {
    try {
      localStorage.clear()
      sessionStorage.clear()
      // Clear all keys one by one to ensure zustand persist state is gone
      const lsKeys = Object.keys(localStorage)
      lsKeys.forEach(key => localStorage.removeItem(key))
      const ssKeys = Object.keys(sessionStorage)
      ssKeys.forEach(key => sessionStorage.removeItem(key))
    } catch (e) {
      console.warn('Error clearing storage:', e)
    }
  })
  
  // Reload to ensure cleared state takes effect
  await page.goto('/login', { waitUntil: 'networkidle' })
  
  // If still on dashboard, auth.init() restored session - force to login
  let retries = 0
  while (page.url().includes('/dashboard') && retries < 3) {
    console.log(`[Auth Helper] Redirected to dashboard (retry ${retries + 1}/3), forcing logout...`)
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    await page.goto('/login', { waitUntil: 'load' })
    retries++
    await page.waitForTimeout(500)
  }
  
  // Wait for login UI to appear (either form or role buttons)
  try {
    await Promise.race([
      page.waitForSelector('input[type="email"]', { timeout: 15_000 }),
      page.waitForSelector('button:has-text("Admin")', { timeout: 15_000 })
    ])
  } catch (e) {
    console.error('[Auth Helper] Login UI not found after', retries, 'retries. Current URL:', page.url())
    // Take a screenshot for debugging
    await page.screenshot({ path: `test-results/login-failure-${Date.now()}.png` })
    throw new Error(`Login page did not render. URL: ${page.url()}. Check screenshot.`)
  }
  
  try {
    // Try role button first (more reliable in dev)
    const adminRoleButton = page.getByRole('button', { name: /Admin/i }).first()
    if (await adminRoleButton.isVisible({ timeout: 2_000 })) {
      console.log('[Auth Helper] Using role button login')
      await adminRoleButton.click()
      await page.waitForURL(url => url.pathname.includes('/dashboard'), { timeout: 60_000 })
      await handleOnboardingIfNeeded(page)
      return
    }
  } catch (e) {
    console.log('[Auth Helper] Role button not available, using email/password')
  }
  
  // Fallback to email/password
  await page.fill('input[type="email"]', 'admin@trakr.com')
  await page.fill('input[type="password"]', 'Password@123')
  await page.getByRole('button', { name: /Sign in|Log in/i }).click()
  
  await page.waitForURL(url => url.pathname.includes('/dashboard') || url.pathname.includes('/onboarding'), { timeout: 60_000 })
  await handleOnboardingIfNeeded(page)
}

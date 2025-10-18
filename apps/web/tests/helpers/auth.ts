import { Page } from '@playwright/test'

/**
 * Handle onboarding screen if it appears after login.
 * Completes org creation for admin users without orgId.
 */
export async function handleOnboardingIfNeeded(page: Page) {
  try {
    const welcomeHeading = page.getByRole('heading', { name: /Welcome/i })
    if (await welcomeHeading.isVisible({ timeout: 2_000 })) {
      // Fill onboarding form
      await page.fill('input[id="orgName"]', 'Test Organization')
      await page.getByRole('button', { name: /Create Organization/i }).click()
      await page.waitForURL(url => url.pathname.includes('/dashboard'), { timeout: 30_000 })
    }
  } catch (e) {
    // Onboarding not needed or already completed
  }
}

/**
 * Login as admin user (handles both role button and email/password).
 * Auto-completes onboarding if user doesn't have orgId.
 */
export async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/login')
  
  try {
    // Try role button first (more reliable)
    const adminRoleButton = page.getByRole('button', { name: /Admin/i }).first()
    if (await adminRoleButton.isVisible({ timeout: 5_000 })) {
      await adminRoleButton.click()
      await page.waitForURL(url => url.pathname.includes('/dashboard'), { timeout: 60_000 })
      await handleOnboardingIfNeeded(page)
      return
    }
  } catch (e) {
    // Role button not available, try email/password
  }
  
  // Fallback to email/password
  await page.fill('input[type="email"]', 'admin@trakr.com')
  await page.fill('input[type="password"]', 'Password@123')
  await page.getByRole('button', { name: /Sign in|Log in/i }).click()
  
  await page.waitForURL(url => url.pathname.includes('/dashboard') || url.pathname.includes('/onboarding'), { timeout: 60_000 })
  await handleOnboardingIfNeeded(page)
}

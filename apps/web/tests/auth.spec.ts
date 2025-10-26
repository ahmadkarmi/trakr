import { test, expect } from '@playwright/test'
import { loginAsAdmin as sharedLoginAsAdmin } from './helpers/auth'

// Helper function to login with role button (more reliable in CI)
async function loginAsAdmin(page: any) {
  await sharedLoginAsAdmin(page)
  await expect(page.getByRole('heading', { name: /Admin Dashboard/i }).first()).toBeVisible({ timeout: 30_000 })
}

async function loginAsAuditor(page: any) {
  await page.goto('/login')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/login')
  
  try {
    // Try role button first (more reliable)
    const auditorRoleButton = page.getByRole('button', { name: /Auditor/i }).first()
    if (await auditorRoleButton.isVisible({ timeout: 5_000 })) {
      await auditorRoleButton.click()
      await page.waitForURL(url => url.pathname.includes('/dashboard/auditor'), { timeout: 60_000 })
      await expect(page.getByRole('heading', { name: /Auditor Dashboard/i }).first()).toBeVisible({ timeout: 30_000 })
      return
    }
  } catch (e) {
    // Role button not available, try email/password
  }
  
  // Fallback to email/password
  await page.fill('input[type="email"]', 'auditor@trakr.com')
  await page.fill('input[type="password"]', 'Password@123')
  await page.getByRole('button', { name: /Sign in|Log in/i }).click()
  
  await page.waitForURL(url => url.pathname.includes('/dashboard/auditor'), { timeout: 60_000 })
  await expect(page.getByRole('heading', { name: /Auditor Dashboard/i }).first()).toBeVisible({ timeout: 30_000 })
}

async function loginAsBranchManager(page: any) {
  await page.goto('/login')
  await page.context().clearCookies()
  await page.evaluate(() => localStorage.clear())
  await page.goto('/login', { waitUntil: 'networkidle' })
  
  try {
    // Try role button first (more reliable)
    const branchManagerRoleButton = page.getByRole('button', { name: /Branch Manager/i }).first()
    if (await branchManagerRoleButton.isVisible({ timeout: 5_000 })) {
      await branchManagerRoleButton.click()
      await page.waitForURL(url => url.pathname.includes('/dashboard'), { timeout: 30_000 })
      await expect(page.getByRole('heading', { name: /Dashboard|Branch Manager/i }).first()).toBeVisible({ timeout: 15_000 })
      return
    }
  } catch (e) {
    // Role button not available, try email/password
  }
  
  // Fallback to email/password
  await page.fill('input[type="email"]', 'branchmanager@trakr.com')
  await page.fill('input[type="password"]', 'Password@123')
  await page.getByRole('button', { name: /Sign in|Log in/i }).click()
  
  await page.waitForURL(url => url.pathname.includes('/dashboard'), { timeout: 30_000 })
  await expect(page.getByRole('heading', { name: /Dashboard|Branch Manager/i }).first()).toBeVisible({ timeout: 15_000 })
}

// Admin/Auditor/Branch Manager smoke tests using email/password authentication
test.describe('Auth smoke', () => {
  test('admin can sign in and see Admin Dashboard', async ({ page }) => {
    await loginAsAdmin(page)
    // Verify we're on the admin dashboard
    await expect(page.getByRole('heading', { name: /Admin Dashboard/i }).first()).toBeVisible()
  })

  // SKIPPED: Auditor auth account not created in seed script
  // Seed script creates public.users entries but not auth.users
  // To enable: Create auditor account in Supabase Auth with auditor@trakr.com
  test.skip('admin can sign out and auditor can sign in', async ({ page }) => {
    // Sign in as admin first
    await loginAsAdmin(page)
    await expect(page.getByRole('heading', { name: /Admin Dashboard/i }).first()).toBeVisible()

    // Open user menu and sign out
    await page.getByLabel('User menu').click()
    await page.getByRole('menuitem', { name: 'Sign Out' }).click()
    
    // Wait for landing page or login page (landing is new default after sign out)
    await page.waitForURL(url => url.pathname === '/' || url.pathname.includes('/login'), { timeout: 30_000 })
    
    // Navigate to login page if we're on landing
    if (page.url().endsWith('/')) {
      await page.goto('/login')
    }

    // Sign in as auditor
    await loginAsAuditor(page)
  })

  test('branch manager can sign in and see Branch Manager Dashboard', async ({ page }) => {
    await loginAsBranchManager(page)
    await expect(page.getByRole('heading', { name: /Branch Manager Dashboard/i }).first()).toBeVisible()
  })
})

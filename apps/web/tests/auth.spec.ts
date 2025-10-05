import { test, expect } from '@playwright/test'

// Helper function to login with email/password
async function loginWithCredentials(page: any, email: string, password: string = 'Password123!') {
  await page.goto('/login')
  
  // Clear any existing session
  await page.evaluate(() => localStorage.clear())
  await page.goto('/login')
  
  // Fill in credentials
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  
  // Click sign in button
  await page.getByRole('button', { name: /sign in/i }).click()
  
  // Wait for redirect away from login
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 60_000 })
}

// Admin/Auditor smoke tests using real authentication
test.describe('Auth smoke', () => {
  test('admin can sign in via credentials and see Admin Dashboard', async ({ page }) => {
    await loginWithCredentials(page, 'admin@trakr.com')
    await expect(page.getByRole('heading', { name: /Admin Dashboard/i })).toBeVisible({ timeout: 60_000 })
  })

  test('admin can sign out and auditor can sign in via credentials', async ({ page }) => {
    // Sign in as admin first
    await loginWithCredentials(page, 'admin@trakr.com')
    await expect(page.getByRole('heading', { name: /Admin Dashboard/i })).toBeVisible({ timeout: 60_000 })

    // Open user menu and sign out
    await page.getByLabel('User menu').click()
    await page.getByRole('menuitem', { name: 'Sign Out' }).click()
    
    // Wait for login page
    await page.waitForURL(url => url.pathname.includes('/login'), { timeout: 30_000 })

    // Sign in as auditor
    await loginWithCredentials(page, 'auditor@trakr.com')
    await expect(page.getByRole('heading', { name: /Auditor Dashboard/i })).toBeVisible({ timeout: 60_000 })
  })

  test('branch manager can sign in via credentials and see Branch Manager Dashboard', async ({ page }) => {
    await loginWithCredentials(page, 'branchmanager@trakr.com')
    await expect(page.getByRole('heading', { name: /Branch Manager Dashboard/i })).toBeVisible({ timeout: 60_000 })
  })
})

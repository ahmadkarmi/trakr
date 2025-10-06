import { test, expect } from '@playwright/test'

// Helper function to login with email/password
async function loginAsAdmin(page: any) {
  await page.goto('/login')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/login')
  
  // Fill in email and password
  await page.fill('input[type="email"]', 'admin@trakr.com')
  await page.fill('input[type="password"]', 'Password123!')
  
  // Click login button
  await page.click('button[type="submit"]')
  
  await page.waitForURL(url => url.pathname.includes('/dashboard/admin'), { timeout: 60_000 })
  await expect(page.getByRole('heading', { name: /Admin Dashboard/i })).toBeVisible({ timeout: 30_000 })
}

async function loginAsAuditor(page: any) {
  await page.goto('/login')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/login')
  
  // Fill in email and password
  await page.fill('input[type="email"]', 'auditor@trakr.com')
  await page.fill('input[type="password"]', 'Password123!')
  
  // Click login button
  await page.click('button[type="submit"]')
  
  await page.waitForURL(url => url.pathname.includes('/dashboard/auditor'), { timeout: 60_000 })
  await expect(page.getByRole('heading', { name: /Auditor Dashboard/i })).toBeVisible({ timeout: 30_000 })
}

async function loginAsBranchManager(page: any) {
  await page.goto('/login')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/login')
  
  // Fill in email and password
  await page.fill('input[type="email"]', 'branchmanager@trakr.com')
  await page.fill('input[type="password"]', 'Password123!')
  
  // Click login button
  await page.click('button[type="submit"]')
  
  await page.waitForURL(url => url.pathname.includes('/dashboard/branch-manager'), { timeout: 60_000 })
  await expect(page.getByRole('heading', { name: /Branch Manager Dashboard/i })).toBeVisible({ timeout: 30_000 })
}

// Admin/Auditor/Branch Manager smoke tests using email/password authentication
test.describe('Auth smoke', () => {
  test('admin can sign in and see Admin Dashboard', async ({ page }) => {
    await loginAsAdmin(page)
    // Verify we're on the admin dashboard
    await expect(page.getByRole('heading', { name: /Admin Dashboard/i })).toBeVisible()
  })

  test('admin can sign out and auditor can sign in', async ({ page }) => {
    // Sign in as admin first
    await loginAsAdmin(page)
    await expect(page.getByRole('heading', { name: /Admin Dashboard/i })).toBeVisible()

    // Open user menu and sign out
    await page.getByLabel('User menu').click()
    await page.getByRole('menuitem', { name: 'Sign Out' }).click()
    
    // Wait for login page
    await page.waitForURL(url => url.pathname.includes('/login'), { timeout: 30_000 })

    // Sign in as auditor
    await loginAsAuditor(page)
    await expect(page.getByRole('heading', { name: /Auditor Dashboard/i })).toBeVisible()
  })

  test('branch manager can sign in and see Branch Manager Dashboard', async ({ page }) => {
    await loginAsBranchManager(page)
    await expect(page.getByRole('heading', { name: /Branch Manager Dashboard/i })).toBeVisible()
  })
})

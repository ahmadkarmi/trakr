import { test, expect } from '@playwright/test'

// Helper function to login using role button (works without password!)
async function loginAsAdmin(page: any) {
  await page.goto('/login')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/login')
  
  const adminBtn = page.getByRole('button', { name: /Login as Admin/i })
  await expect(adminBtn).toBeVisible({ timeout: 30_000 })
  await adminBtn.click()
  
  await page.waitForURL(url => url.pathname.includes('/dashboard/admin'), { timeout: 60_000 })
  await expect(page.getByRole('heading', { name: /Admin Dashboard/i })).toBeVisible({ timeout: 30_000 })
}

async function loginAsAuditor(page: any) {
  await page.goto('/login')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/login')
  
  const auditorBtn = page.getByRole('button', { name: /Login as Auditor/i })
  await expect(auditorBtn).toBeVisible({ timeout: 30_000 })
  await auditorBtn.click()
  
  await page.waitForURL(url => url.pathname.includes('/dashboard/auditor'), { timeout: 60_000 })
  await expect(page.getByRole('heading', { name: /Auditor Dashboard/i })).toBeVisible({ timeout: 30_000 })
}

async function loginAsBranchManager(page: any) {
  await page.goto('/login')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/login')
  
  const bmBtn = page.getByRole('button', { name: /Login as Branch Manager/i })
  await expect(bmBtn).toBeVisible({ timeout: 30_000 })
  await bmBtn.click()
  
  await page.waitForURL(url => url.pathname.includes('/dashboard/branch-manager'), { timeout: 60_000 })
  await expect(page.getByRole('heading', { name: /Branch Manager Dashboard/i })).toBeVisible({ timeout: 30_000 })
}

// Admin/Auditor/Branch Manager smoke tests using role button authentication
test.describe('Auth smoke', () => {
  test('admin can sign in via role button and see Admin Dashboard', async ({ page }) => {
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

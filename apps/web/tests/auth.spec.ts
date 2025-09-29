import { test, expect } from '@playwright/test'

// Admin/Auditor smoke via UI role buttons to validate core navigation
test.describe('Auth smoke', () => {
  test('admin can sign in via UI and see Admin Dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /Login as Admin/i }).click()
    await expect(page.getByRole('heading', { name: /Admin Dashboard/i })).toBeVisible({ timeout: 60_000 })
  })

  test('admin can sign out and auditor can sign in via UI', async ({ page }) => {
    // If not already on dashboard, sign in as admin first
    if (!page.url().includes('/dashboard/admin')) {
      await page.goto('/login')
      await page.getByRole('button', { name: /Login as Admin/i }).click()
      await expect(page.getByRole('heading', { name: /Admin Dashboard/i })).toBeVisible({ timeout: 60_000 })
    }

    // Open user menu and sign out
    await page.getByLabel('User menu').click()
    await page.getByRole('menuitem', { name: 'Sign Out' }).click()
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible({ timeout: 60_000 })

    // Use role button to sign in as auditor
    await page.getByRole('button', { name: /Login as Auditor/i }).click()
    await expect(page.getByRole('heading', { name: /Auditor Dashboard/i })).toBeVisible({ timeout: 60_000 })
  })

  test('branch manager can sign in via UI and see Branch Manager Dashboard', async ({ page }) => {
    await page.goto('/login')

    const branchBtn = page.getByRole('button', { name: /Login as Branch Manager/i })
    const userMenu = page.getByLabel('User menu')

    // If the login page is not visible due to persisted auth, sign out via user menu if present
    if (!(await branchBtn.isVisible().catch(() => false))) {
      if (await userMenu.isVisible().catch(() => false)) {
        await userMenu.click()
        await page.getByRole('menuitem', { name: 'Sign Out' }).click()
        await expect(branchBtn).toBeVisible({ timeout: 30_000 })
      } else {
        // Fallback: clear local storage and reload login
        await page.evaluate(() => localStorage.clear())
        await page.goto('/login')
        await expect(branchBtn).toBeVisible({ timeout: 30_000 })
      }
    }

    await branchBtn.click()
    await expect(page.getByRole('heading', { name: /Branch Manager Dashboard/i })).toBeVisible({ timeout: 60_000 })
  })
})

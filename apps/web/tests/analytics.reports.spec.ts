import { test, expect } from '@playwright/test'

// Minimal, robust admin login via UI role button with fallback to email/password
async function loginAsAdmin(page: any) {
  await page.goto('/login')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/login')

  try {
    const adminRoleButton = page.getByRole('button', { name: /Admin/i }).first()
    if (await adminRoleButton.isVisible({ timeout: 5_000 })) {
      await adminRoleButton.click()
      await page.waitForURL(url => url.pathname.includes('/dashboard/admin'), { timeout: 60_000 })
      await expect(page.getByRole('heading', { name: /Admin Dashboard/i }).first()).toBeVisible({ timeout: 30_000 })
      return
    }
  } catch {}

  // Fallback to email/password if role button not present
  await page.fill('input[type="email"]', 'admin@trakr.com')
  await page.fill('input[type="password"]', 'Password@123')
  await page.getByRole('button', { name: /Sign in|Log in/i }).click()
  await page.waitForURL(url => url.pathname.includes('/dashboard/admin'), { timeout: 60_000 })
  await expect(page.getByRole('heading', { name: /Admin Dashboard/i }).first()).toBeVisible({ timeout: 30_000 })
}

// Analytics Reports responsive behavior
// Verifies: mobile shows branded empty state; desktop shows full analytics UI
test.describe('Analytics Reports (responsive)', () => {
  test.setTimeout(90_000)

  test('mobile shows branded empty state and hides analytics', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 }) // iPhone X-like
    await loginAsAdmin(page)

    await page.goto('/analytics?tab=reports')

    // Expect the polished mobile empty state
    await expect(page.getByText(/Advanced Analytics is best on desktop/i)).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('button', { name: /Copy link to share/i })).toBeVisible()

    // Ensure advanced analytics UI is not rendered on mobile
    await expect(page.getByRole('heading', { name: /Survey Results Explorer/i }).first()).toHaveCount(0)
  })

  test('desktop shows Advanced Analytics UI', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 })
    await loginAsAdmin(page)

    await page.goto('/analytics?tab=reports')

    // The Advanced Analytics container should render on desktop
    await expect(page.getByRole('heading', { name: /Survey Results Explorer/i }).first()).toBeVisible({ timeout: 60_000 })

    // Optional: View selector present
    await expect(page.getByRole('button', { name: /Data Grid/i }).first()).toBeVisible()
  })
})

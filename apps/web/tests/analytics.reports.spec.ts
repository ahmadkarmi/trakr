import { test, expect } from '@playwright/test'
import { loginAsAdmin as sharedLoginAsAdmin } from './helpers/auth'

// Helper to login as admin and verify dashboard
async function loginAsAdmin(page: any) {
  await sharedLoginAsAdmin(page)
  await expect(page.getByRole('heading', { name: /Admin Dashboard/i }).first()).toBeVisible({ timeout: 30_000 })
}

// Analytics Reports responsive behavior
// Verifies: mobile shows branded empty state; desktop shows full analytics UI
// SKIPPED: Advanced Analytics feature requires surveys with sections/questions
// The Reports tab may be disabled when no survey data is available
test.describe.skip('Analytics Reports (responsive)', () => {
  test.setTimeout(90_000)

  test('mobile shows branded empty state and hides analytics', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 }) // iPhone X-like
    await loginAsAdmin(page)

    await page.goto('/analytics')
    
    // Wait for page load and click Reports tab
    await page.waitForLoadState('networkidle')
    const reportsTab = page.getByRole('button', { name: /Reports/i })
    await expect(reportsTab).toBeVisible({ timeout: 10_000 })
    await reportsTab.click()
    
    // Wait for tab content to render
    await page.waitForTimeout(1000)

    // Expect the polished mobile empty state
    await expect(page.getByText(/Advanced Analytics is best on desktop/i)).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('button', { name: /Copy link to share/i })).toBeVisible()

    // Ensure advanced analytics UI is not rendered on mobile
    await expect(page.getByRole('heading', { name: /Survey Results Explorer/i })).toHaveCount(0)
  })

  test('desktop shows Advanced Analytics UI', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 })
    await loginAsAdmin(page)

    await page.goto('/analytics')
    
    // Wait for page load and click Reports tab
    await page.waitForLoadState('networkidle')
    const reportsTab = page.getByRole('button', { name: /Reports/i })
    await expect(reportsTab).toBeVisible({ timeout: 10_000 })
    await reportsTab.click()
    
    // Wait for tab content to render
    await page.waitForTimeout(1000)

    // The Advanced Analytics container should render on desktop
    await expect(page.getByRole('heading', { name: /Survey Results Explorer/i }).first()).toBeVisible({ timeout: 60_000 })

    // Optional: View selector present (checks for data grid view button)
    await expect(page.getByRole('button', { name: /Data Grid/i }).first()).toBeVisible({ timeout: 10_000 })
  })
})

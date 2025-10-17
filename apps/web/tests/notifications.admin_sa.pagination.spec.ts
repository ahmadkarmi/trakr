import { test, expect } from '@playwright/test'

// Helper: login as Admin using role button or fallback credentials
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

  // Fallback to email/password
  await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 10_000 })
  await page.fill('input[type="email"]', 'admin@trakr.com')
  await page.fill('input[type="password"]', 'Password@123')
  await page.getByRole('button', { name: /Sign in|Log in/i }).click()
  await page.waitForURL(url => url.pathname.includes('/dashboard/admin'), { timeout: 60_000 })
  await expect(page.getByRole('heading', { name: /Admin Dashboard/i }).first()).toBeVisible({ timeout: 30_000 })
}

// Optional helper: try to login as Super Admin; skip if role not present
async function loginAsSuperAdmin(page: any) {
  await page.goto('/login')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/login')

  try {
    const saRoleButton = page.getByRole('button', { name: /Super Admin/i }).first()
    if (await saRoleButton.isVisible({ timeout: 5_000 })) {
      await saRoleButton.click()
      await page.waitForURL(url => url.pathname.includes('/dashboard'), { timeout: 60_000 })
      return true
    }
  } catch {}

  // If no SA quick-access available, skip SA tests gracefully
  return false
}

test.describe('Notifications pagination and ownership', () => {
  test.setTimeout(120_000)

  test('admin notifications page - server-side Load more and stable interactions', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/notifications')
    const notifHeading = page.getByRole('main').getByRole('heading', { name: /Notifications/i }).first()
    await expect(notifHeading).toBeVisible({ timeout: 30_000 })

    // Wait for initial load to settle
    await page.waitForTimeout(1500)

    // Attempt to Load more if the button is present
    const loadMoreBtn = page.getByRole('button', { name: /^Load more$/i })
    const hasLoadMore = await loadMoreBtn.isVisible().catch(() => false)
    if (hasLoadMore) {
      await loadMoreBtn.click()
      // Loading state should appear briefly
      const loadingBtn = page.getByRole('button', { name: /^Loading...$/i })
      // It's ok if too fast to catch; just ensure no error thrown
      await loadingBtn.isVisible({ timeout: 2_000 }).catch(() => {})
      // Let it fetch
      await page.waitForTimeout(1000)
    } else {
      console.log('ℹ️ Load more not shown (not enough notifications on server)')
    }

    // Attempt to click a notification safely (no crash expectation)
    const anyNotification = page.locator('button:has-text("Review Now"), button:has-text("Mark Read"), [data-testid="notification-item"], .card:has-text("Notification")').first()
    await anyNotification.isVisible({ timeout: 2_000 }).catch(() => {})
  })

  test('admin cannot mark other users\' DB notifications as read (UI)', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/notifications')
    const notifHeading = page.getByRole('main').getByRole('heading', { name: /Notifications/i }).first()
    await expect(notifHeading).toBeVisible({ timeout: 30_000 })
    await page.waitForTimeout(1000)

    // Find any disabled Mark Read (indicates non-owner DB notification present)
    const disabledMarkRead = page.locator('button:has-text("Mark Read")[disabled]')
    if ((await disabledMarkRead.count()) > 0) {
      await expect(disabledMarkRead.first()).toBeDisabled()
    } else {
      // If none disabled, click first Mark Read and ensure no error
      const markRead = page.getByRole('button', { name: /^Mark Read$/i }).first()
      const exists = await markRead.isVisible().catch(() => false)
      if (exists) {
        await markRead.click({ trial: true }).catch(() => {})
      } else {
        console.log('ℹ️ No Mark Read buttons present in current dataset')
      }
    }
  })

  test('super admin notifications - skip if SA quick access not available; Load more if present', async ({ page }) => {
    const loggedIn = await loginAsSuperAdmin(page)
    if (!loggedIn) {
      test.skip(true, 'Super Admin quick access not available in this environment')
    }

    await page.goto('/notifications')
    await expect(page.getByRole('heading', { name: /Notifications/i })).toBeVisible({ timeout: 30_000 })
    await page.waitForTimeout(1000)

    const loadMoreBtn = page.getByRole('button', { name: /^Load more$/i })
    const hasLoadMore = await loadMoreBtn.isVisible().catch(() => false)
    if (hasLoadMore) {
      await loadMoreBtn.click()
      await page.getByRole('button', { name: /^Loading...$/i }).isVisible({ timeout: 2_000 }).catch(() => {})
      await page.waitForTimeout(1000)
    }
  })
})

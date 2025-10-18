import { test, expect } from '@playwright/test'

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
  await page.fill('input[type="email"]', 'admin@trakr.com')
  await page.fill('input[type="password"]', 'Password@123')
  await page.getByRole('button', { name: /Sign in|Log in/i }).click()
  await page.waitForURL(url => url.pathname.includes('/dashboard/admin'), { timeout: 60_000 })
  await expect(page.getByRole('heading', { name: /Admin Dashboard/i }).first()).toBeVisible({ timeout: 30_000 })
}

test.describe.skip('/manage/unassigned', () => {
  test('loads and defaults to All frequency', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/manage/unassigned')
    await expect(page.getByRole('heading', { name: /Unassigned Surveys/i })).toBeVisible({ timeout: 30_000 })

    // Verify filter defaults to All
    const freqSelect = page.locator('select').first()
    const selected = await freqSelect.evaluate((el: HTMLSelectElement) => el.value)
    expect(selected.toLowerCase()).toBe('all')
  })

  test('actions render in one line and assignment logs appear after assigning', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/manage/unassigned')
    await expect(page.getByRole('heading', { name: /Unassigned Surveys/i })).toBeVisible({ timeout: 30_000 })

    // Find first row
    const row = page.locator('div.border-gray-200.rounded-lg').first()
    const hasRow = await row.isVisible().catch(() => false)
    if (!hasRow) test.skip(true, 'No unassigned items; skipping assignment flow')

    // Ensure inline actions visible
    await expect(page.getByText('Select auditor…').first()).toBeVisible()
    const assignBtn = page.getByRole('button', { name: /^Assign$/ }).first()
    const makeSoleBtn = page.getByRole('button', { name: /Make Sole/i }).first()
    const startBtn = page.getByRole('button', { name: /Start Audit as Admin/i }).first()
    await expect(assignBtn).toBeVisible()
    await expect(makeSoleBtn).toBeVisible()
    await expect(startBtn).toBeVisible()

    // Try to assign if there is at least one auditor option
    const select = page.locator('select').nth(1)
    const options = await select.locator('option').allTextContents()
    const opt = options.find(o => o && o.trim() && !/Select auditor/i.test(o))
    if (!opt) test.skip(true, 'No auditors available to assign; skipping assignment action')

    await select.selectOption({ label: opt })
    await assignBtn.click()

    // Wait for log section
    const logHeading = page.getByRole('heading', { name: /Recent Assignment Changes/i })
    await expect(logHeading).toBeVisible({ timeout: 30_000 })
  })
})

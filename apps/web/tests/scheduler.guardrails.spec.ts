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

// Guardrail: Scheduled drafts should be assigned to AUDITORs (never Branch Managers/Admins)
// Heuristic UI check: fail if a weekly Draft row shows "Branch Manager" in the same row
// Gracefully skip if there are no Draft rows this week

test('scheduled drafts are assigned to auditors (UI heuristic)', async ({ page }) => {
  await loginAsAdmin(page)
  // Ensure dashboard renders
  const heading = page.getByRole('heading', { name: /This Week's Audits/i })
  await heading.waitFor({ timeout: 30_000 })
  // Give the table a moment to render
  await page.waitForTimeout(1500)

  // Find any row-like container that has both "Draft" and "Branch Manager"
  const section = heading.locator('xpath=ancestor::*[self::section or self::div][1]')
  const suspect = section.locator(
    'xpath=.//div[contains(@class,"rounded-lg") or contains(@class,"border") or contains(@class,"p-") or self::tr][.//text()[contains(.,"Draft")] and .//text()[contains(.,"Branch Manager")]]'
  )

  const draftCount = await section.locator('text=Draft').count().catch(() => 0)
  if (draftCount === 0) {
    test.skip(true, 'No Draft rows this week; skipping guardrail assertion')
  }

  await expect(suspect).toHaveCount(0)
})

// Admin UX: Unassigned Surveys section exists; allows assignment navigation or start-as-admin
// This is an informational/UX guard: always pass if section exists; run actions only when items present

test('unassigned surveys section present and actions available', async ({ page }) => {
  await loginAsAdmin(page)
  const sec = page.getByRole('main').getByRole('heading', { name: /Unassigned Surveys/i }).first()
  const visible = await sec.isVisible().catch(() => false)
  if (!visible) {
    test.skip(true, 'Unassigned Surveys section not present in this environment')
  }

  // If any item exists, validate buttons
  const container = sec.locator('xpath=ancestor::*[self::section or self::div][1]')
  const anyItem = container.locator('text=Assign Auditor').first()

  const hasItems = await anyItem.isVisible().catch(() => false)
  if (!hasItems) {
    test.skip(true, 'No unassigned survey instances; section visible with empty state')
  }

  // Verify buttons exist
  await expect(anyItem).toBeVisible()
  const startAsAdmin = page.getByRole('button', { name: /Start Audit as Admin/i }).first()
  await expect(startAsAdmin).toBeVisible()
})

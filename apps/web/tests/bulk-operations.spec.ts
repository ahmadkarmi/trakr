import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/auth'
import {
  getUserByEmail,
  ensureZoneForOrg,
  createInactiveBranch,
  linkBranchToZone,
  deleteBranches,
  getBranchActive,
  setAuditorAssignmentDirect,
  getAuditorAssignmentBranchIds,
} from './helpers/e2eSetup'

// Bulk operations on /manage/branches: zone-based bulk auditor assignment
// and one-click bulk branch activation. Both previously had zero e2e
// coverage despite mutating many rows in a single user action.
//
// Setup/teardown here is additive-only against the shared auditor_assignments
// row (never clears or replaces it) — the account is shared with other spec
// files and a DB-level guard rejects unassigning an auditor from any branch
// that's currently active, so a naive "reset to empty" can fail outright or
// clobber fixtures that legitimately belong to other tests.
test.describe('Bulk operations', () => {
  test.setTimeout(60_000)

  let orgId: string
  let auditorId: string

  test.beforeAll(async () => {
    const admin = await getUserByEmail('admin@trakr.com')
    const auditor = await getUserByEmail('auditor@trakr.com')
    if (!admin || !auditor) throw new Error('Seed users missing')
    if (!admin.org_id) throw new Error('admin@trakr.com has no org_id')
    orgId = admin.org_id
    auditorId = auditor.id
  })

  test('admin can bulk-assign an auditor to every branch in a zone', async ({ page }) => {
    const zone = await ensureZoneForOrg(orgId, 'E2E Bulk Zone')
    const branch = await createInactiveBranch(orgId, 'E2E Bulk-Assign Branch')
    await linkBranchToZone(zone.id, branch.id)

    try {
      await loginAsAdmin(page)
      await page.goto('/manage/branches', { waitUntil: 'networkidle' })

      await page.getByRole('button', { name: /Bulk Assign by Zone/i }).click()

      // The page also has a static "Bulk Assign Auditors by Zone" card
      // heading behind the modal, so anchor on the zone <select> (unique to
      // the modal) rather than the ambiguous shared heading text — matching
      // on the heading with .last() breaks once the modal closes, since
      // .last() then re-resolves to the ever-present static card heading.
      const zoneSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'Choose a zone' }) })
      await expect(zoneSelect).toBeVisible({ timeout: 10_000 })
      await zoneSelect.selectOption({ value: zone.id })

      // Matched by email, not name: the seed data has several similarly-named
      // auditors ("Auditor1", "Auditor2", ...) and the target account's own
      // display name is just "Auditor".
      const auditorRow = page.locator('label').filter({ hasText: 'auditor@trakr.com' }).first()
      await expect(auditorRow).toBeVisible({ timeout: 10_000 })
      await auditorRow.locator('input[type="checkbox"]').check()

      await page.getByRole('button', { name: /Assign \d+ to Zone/i }).click()

      // Modal closes on success (onClose is called from the mutation's onSuccess)
      await expect(zoneSelect).not.toBeVisible({ timeout: 15_000 })

      await expect
        .poll(async () => getAuditorAssignmentBranchIds(auditorId), { timeout: 15_000, intervals: [1_000] })
        .toContain(branch.id)
    } finally {
      // Deliberately not unassigning branch.id from the auditor first: it's
      // never activated in this test, so the delete below leaves at most a
      // harmless dangling id in auditor_assignments.branch_ids (no FK there).
      await deleteBranches([branch.id])
    }
  })

  test('admin can bulk-activate all eligible branches at once', async ({ page }) => {
    const branchA = await createInactiveBranch(orgId, 'E2E Bulk-Activate A')
    const branchB = await createInactiveBranch(orgId, 'E2E Bulk-Activate B')
    // Eligibility requires at least one assigned auditor per branch, read
    // from auditor_assignments (see setAuditorAssignmentDirect for why this
    // isn't the same table the assignment-board RPC writes to). Additive:
    // keep whatever the shared account was already assigned to.
    const existing = await getAuditorAssignmentBranchIds(auditorId)
    await setAuditorAssignmentDirect(auditorId, orgId, [...new Set([...existing, branchA.id, branchB.id])], [])

    try {
      expect(await getBranchActive(branchA.id)).toBe(false)
      expect(await getBranchActive(branchB.id)).toBe(false)

      await loginAsAdmin(page)
      await page.goto('/manage/branches', { waitUntil: 'networkidle' })

      // The button's accessible name comes from an aria-label that differs
      // from its visible "Activate All Eligible" text ("Activate N eligible
      // branches" when enabled, "No eligible branches to activate" when not).
      const activateButton = page.getByRole('button', { name: /Activate \d+ eligible branch/i })
      await expect(activateButton).toBeEnabled({ timeout: 20_000 })
      await activateButton.click()

      await expect(page.getByText(/Activated \d+ branch/i)).toBeVisible({ timeout: 20_000 })

      await expect.poll(async () => getBranchActive(branchA.id), { timeout: 15_000, intervals: [1_000] }).toBe(true)
      await expect.poll(async () => getBranchActive(branchB.id), { timeout: 15_000, intervals: [1_000] }).toBe(true)
    } finally {
      // Both branches just got activated by the test itself, so touching
      // auditor_assignments here would hit the "can't remove auditor from an
      // active branch" DB trigger. That trigger only fires on updates to
      // auditor_assignments, not on deleting the branch row itself, so just
      // delete the branches and leave the now-dangling (harmless, no FK) ids
      // in auditor_assignments.branch_ids.
      await deleteBranches([branchA.id, branchB.id])
    }
  })
})

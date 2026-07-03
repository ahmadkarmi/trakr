import { test, expect, type Page } from '@playwright/test'
import {
  getFirstOrganization,
  getUserByEmail,
  ensureBranchForOrg,
  ensureSimpleSurvey,
  ensureAuditorAssignedToBranch,
  ensureBranchManagerAssigned,
  ensureAuditFor,
  setAuditSubmitted,
  getAuditStatus,
  deleteAudits,
} from './helpers/e2eSetup'

// Core review workflow: SUBMITTED → APPROVED and SUBMITTED → REJECTED,
// driven through the branch manager UI (the historically buggy gating path).
test.describe('Audit approval workflow', () => {
  test.setTimeout(120_000)

  let orgId: string
  let branchId: string
  let surveyId: string
  let auditorId: string
  let managerId: string

  test.beforeAll(async () => {
    const org = await getFirstOrganization()
    if (!org) throw new Error('No organization seeded')
    orgId = org.id

    const auditor = await getUserByEmail('auditor@trakr.com')
    const manager = await getUserByEmail('branchmanager@trakr.com')
    if (!auditor || !manager) throw new Error('Seed users missing')
    auditorId = auditor.id
    managerId = manager.id

    const branch = await ensureBranchForOrg(orgId, 'E2E Approval Branch')
    branchId = branch.id
    const survey = await ensureSimpleSurvey(orgId, 'E2E Approval Survey')
    surveyId = survey.id

    await ensureAuditorAssignedToBranch(auditorId, branchId)
    await ensureBranchManagerAssigned(managerId, branchId)
  })

  const createdAuditIds: string[] = []

  test.afterAll(async () => {
    // Shrink blast radius for parallel spec files sharing this database
    await deleteAudits(createdAuditIds)
  })

  async function loginAsBranchManager(page: Page) {
    await page.goto('/login')
    await page.context().clearCookies()
    await page.evaluate(() => localStorage.clear())
    await page.goto('/login', { waitUntil: 'networkidle' })

    try {
      const roleButton = page.getByRole('button', { name: /Branch Manager/i }).first()
      if (await roleButton.isVisible({ timeout: 5_000 })) {
        await roleButton.click()
        await page.waitForURL(url => url.pathname.includes('/dashboard'), { timeout: 30_000 })
        return
      }
    } catch {
      // fall through to credentials
    }
    await page.fill('input[type="email"]', 'branchmanager@trakr.com')
    await page.fill('input[type="password"]', 'Password@123')
    await page.getByRole('button', { name: /Sign in|Log in/i }).click()
    await page.waitForURL(url => url.pathname.includes('/dashboard'), { timeout: 30_000 })
  }

  async function openSubmittedAudit(page: Page): Promise<string> {
    const audit = await ensureAuditFor(auditorId, orgId, branchId, surveyId)
    createdAuditIds.push(audit.id)
    await setAuditSubmitted(audit.id, auditorId)
    await page.goto(`/audits/${audit.id}/summary`, { waitUntil: 'networkidle' })
    return audit.id
  }

  test('branch manager can approve a submitted audit', async ({ page }) => {
    await loginAsBranchManager(page)
    const auditId = await openSubmittedAudit(page)

    const approveButton = page.getByRole('button', { name: /Approve/i }).first()
    await expect(approveButton).toBeVisible({ timeout: 20_000 })
    await approveButton.click()

    // Approve modal: typed-name signature is the default without a saved image
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible({ timeout: 10_000 })
    await modal.getByPlaceholder(/Jane Manager/i).fill('Jane Manager')
    await modal.getByRole('button', { name: /^Approve|Approving/i }).click()

    await expect
      .poll(async () => getAuditStatus(auditId), { timeout: 30_000, intervals: [1_000] })
      .toBe('APPROVED')
  })

  test('branch manager can reject a submitted audit with a note', async ({ page }) => {
    await loginAsBranchManager(page)
    const auditId = await openSubmittedAudit(page)

    const rejectButton = page.getByRole('button', { name: /Reject/i }).first()
    await expect(rejectButton).toBeVisible({ timeout: 20_000 })
    await rejectButton.click()

    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible({ timeout: 10_000 })
    const note = modal.locator('textarea').first()
    if (await note.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await note.fill('Please recheck the fire exit photos.')
    }
    await modal.getByRole('button', { name: /^Reject|Rejecting/i }).click()

    await expect
      .poll(async () => getAuditStatus(auditId), { timeout: 30_000, intervals: [1_000] })
      .toBe('REJECTED')
  })
})

import { test, expect } from '@playwright/test'
import { loginAsAdmin, switchToOrganization } from './helpers/auth'
import {
  getUserByEmail,
  ensureBranchForOrg,
  ensureSimpleSurvey,
  getFirstQuestionId,
  ensureAuditFor,
  setAuditApproved,
  deleteAudits,
} from './helpers/e2eSetup'

// Survey results export (CSV/Excel/PDF) on /analytics's Reports tab
// (AdvancedAnalyticsComplete.tsx -> utils/exportUtils.ts) had zero e2e
// coverage despite being a common report-out workflow for admins.
test.describe('Export paths', () => {
  test.setTimeout(60_000)

  let orgId: string
  let branchId: string
  let surveyId: string
  let questionId: string
  let auditorId: string
  let managerId: string

  test.beforeAll(async () => {
    const admin = await getUserByEmail('admin@trakr.com')
    const auditor = await getUserByEmail('auditor@trakr.com')
    if (!admin || !auditor) throw new Error('Seed users missing')
    if (!auditor.org_id) throw new Error('auditor@trakr.com has no org_id')
    // admin@trakr.com is SUPER_ADMIN, not a regular admin: a fresh login has
    // no stored org preference, so it defaults to whichever org is oldest by
    // created_at (OrganizationContext.tsx) — the live dev DB has stale
    // duplicate-named orgs left over from seeding, so "oldest" isn't
    // guaranteed to be the org the fixed seed accounts actually belong to.
    // Derive orgId from the auditor's own row instead, and explicitly switch
    // the admin session to it via switchToOrganization() below. managerId is
    // just an FK reference for approved_by, so admin.id itself is still fine.
    orgId = auditor.org_id
    auditorId = auditor.id
    managerId = admin.id

    const branch = await ensureBranchForOrg(orgId, 'E2E Export Branch')
    branchId = branch.id
    const survey = await ensureSimpleSurvey(orgId, 'E2E Export Survey')
    surveyId = survey.id
    questionId = await getFirstQuestionId(surveyId)
  })

  const createdAuditIds: string[] = []

  test.afterAll(async () => {
    await deleteAudits(createdAuditIds)
  })

  test('admin can export survey results as CSV, Excel, and PDF', async ({ page }) => {
    const audit = await ensureAuditFor(auditorId, orgId, branchId, surveyId, { [questionId]: 'yes' })
    createdAuditIds.push(audit.id)
    await setAuditApproved(audit.id, managerId)

    await loginAsAdmin(page)
    await switchToOrganization(page, orgId)
    await page.goto('/analytics', { waitUntil: 'networkidle' })

    await page.getByRole('button', { name: /Reports/i }).click()

    const surveySelect = page.locator('select').filter({ has: page.locator(`option[value="${surveyId}"]`) })
    await expect(surveySelect).toBeVisible({ timeout: 15_000 })
    await surveySelect.selectOption({ value: surveyId })

    // Export buttons only render once results.length > 0 for the selected survey.
    const exportCsvButton = page.getByRole('button', { name: /Export CSV/i })
    await expect(exportCsvButton).toBeVisible({ timeout: 20_000 })

    const [csvDownload] = await Promise.all([
      page.waitForEvent('download'),
      exportCsvButton.click(),
    ])
    expect(csvDownload.suggestedFilename()).toMatch(/\.csv$/i)

    const [xlsxDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Export Excel/i }).click(),
    ])
    expect(xlsxDownload.suggestedFilename()).toMatch(/\.xlsx$/i)

    const [pdfDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Export PDF/i }).click(),
    ])
    expect(pdfDownload.suggestedFilename()).toMatch(/\.pdf$/i)
  })
})

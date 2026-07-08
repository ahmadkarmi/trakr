import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/auth'
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
    if (!admin.org_id) throw new Error('admin@trakr.com has no org_id')
    orgId = admin.org_id
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

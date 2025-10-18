import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { getFirstOrganization, ensureSimpleSurvey, getUserByEmail, ensureBranchForOrg, ensureAuditorAssignedToBranch, ensureAuditFor } from './helpers/e2eSetup'

const REQUIRES_ENV = !process.env.E2E_SUPABASE_SERVICE_KEY || !process.env.E2E_SUPABASE_URL

function getAdminClient() {
  const url = (process.env.E2E_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim()
  const service = (process.env.E2E_SUPABASE_SERVICE_KEY || '').trim()
  if (!url || !service) throw new Error('Missing E2E_SUPABASE_URL or E2E_SUPABASE_SERVICE_KEY')
  return createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function bumpSurveyVersion(surveyId: string) {
  const supa = getAdminClient()
  await supa.rpc('publish_survey_version', {
    p_survey_id: surveyId,
    p_sections: [],
    p_title: null,
    p_description: null,
    p_is_active: null,
    p_frequency: null,
    p_applicable_branch_ids: null,
  })
}

async function loginAsAuditor(page: any) {
  await page.goto('/login')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/login')
  try {
    const auditorButton = page.getByRole('button', { name: /Login as Auditor|Auditor/i }).first()
    await auditorButton.click({ trial: true }).catch(() => {})
    if (await auditorButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await auditorButton.click()
    }
  } catch {}
}

test.describe('Pinned survey version is used by audits', () => {
  test.setTimeout(120_000)
  test.skip(REQUIRES_ENV, 'Requires E2E_SUPABASE_URL and E2E_SUPABASE_SERVICE_KEY')

  test('audit continues to use original survey version after new publish', async ({ page }) => {
    const org = await getFirstOrganization()
    if (!org) test.skip(true, 'No organization available')

    const survey = await ensureSimpleSurvey(org!.id)
    const branch = await ensureBranchForOrg(org!.id)
    const auditor = await getUserByEmail('auditor@trakr.com')
    if (!auditor) test.skip(true, 'Auditor user not found')

    await ensureAuditorAssignedToBranch(auditor.id, branch.id)
    const audit = await ensureAuditFor(auditor.id, org!.id, branch.id, survey.id)

    await bumpSurveyVersion(survey.id)

    await loginAsAuditor(page)
    await page.goto(`/audit/${audit.id}/summary`)

    const heading = page.getByRole('heading', { name: /Review Audit/i })
    await expect(heading).toBeVisible({ timeout: 30_000 })

    const sectionTitle = page.locator('text=E2E Page 1').first()
    await expect(sectionTitle).toBeVisible({ timeout: 15_000 })
  })
})

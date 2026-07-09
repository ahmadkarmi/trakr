import { test, expect, type Page } from '@playwright/test'
import {
  getUserByEmail,
  ensureBranchForOrg,
  ensureSimpleSurvey,
  ensureAuditorAssignedToBranch,
  ensureBranchManagerAssigned,
  ensureAuditFor,
  setAuditSubmitted,
  setAuditRejected,
  getFirstQuestionId,
  getAuditStatus,
  deleteAudits,
  getUserClient,
} from './helpers/e2eSetup'

// Core review workflow: SUBMITTED → APPROVED and SUBMITTED → REJECTED,
// driven through the branch manager UI (the historically buggy gating path).
test.describe('Audit approval workflow', () => {
  test.setTimeout(120_000)

  let orgId: string
  let branchId: string
  let surveyId: string
  let questionId: string
  let auditorId: string
  let managerId: string

  test.beforeAll(async () => {
    const auditor = await getUserByEmail('auditor@trakr.com')
    const manager = await getUserByEmail('branchmanager@trakr.com')
    if (!auditor || !manager) throw new Error('Seed users missing')
    if (!manager.org_id) throw new Error('branchmanager@trakr.com has no org_id')
    auditorId = auditor.id
    managerId = manager.id
    // Derive org from the manager's own row, not "oldest org in the table" —
    // the seed can leave multiple same-named orgs behind across runs, and
    // getFirstOrganization() has no guarantee of matching whichever org the
    // fixed dev-login accounts currently belong to.
    orgId = manager.org_id

    const branch = await ensureBranchForOrg(orgId, 'E2E Approval Branch')
    branchId = branch.id
    const survey = await ensureSimpleSurvey(orgId, 'E2E Approval Survey')
    surveyId = survey.id
    questionId = await getFirstQuestionId(surveyId)

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

  async function loginAsAuditor(page: Page) {
    await page.goto('/login')
    await page.context().clearCookies()
    await page.evaluate(() => localStorage.clear())
    await page.goto('/login', { waitUntil: 'networkidle' })

    try {
      const roleButton = page.getByRole('button', { name: /^Auditor/i }).first()
      if (await roleButton.isVisible({ timeout: 5_000 })) {
        await roleButton.click()
        await page.waitForURL(url => url.pathname.includes('/dashboard'), { timeout: 30_000 })
        return
      }
    } catch {
      // fall through to credentials
    }
    await page.fill('input[type="email"]', 'auditor@trakr.com')
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

  test('a second approval call on an already-decided audit is rejected, not silently applied', async ({ page }) => {
    // Regression test for the set_audit_approval race condition: the RPC
    // used to blindly UPDATE regardless of current status, so a second
    // concurrent approve/reject call would silently overwrite the first.
    // Heavier than its siblings (full UI approval + a second authenticated
    // client + RPC round trip) — give it more room than the describe-level
    // 120s so a slow run doesn't hit afterAll cleanup mid-flight and race
    // its own assertions.
    test.setTimeout(180_000)
    await loginAsBranchManager(page)
    const auditId = await openSubmittedAudit(page)

    const approveButton = page.getByRole('button', { name: /Approve/i }).first()
    await expect(approveButton).toBeVisible({ timeout: 20_000 })
    await approveButton.click()
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible({ timeout: 10_000 })
    await modal.getByPlaceholder(/Jane Manager/i).fill('First Approval')
    await modal.getByRole('button', { name: /^Approve|Approving/i }).click()

    await expect
      .poll(async () => getAuditStatus(auditId), { timeout: 30_000, intervals: [1_000] })
      .toBe('APPROVED')

    // Simulate a second, racing approval call directly against the RPC —
    // as a real authenticated manager session, exercising the exact same
    // auth.uid()-gated code path the UI's mutation does.
    const managerClient = await getUserClient('branchmanager@trakr.com', 'Password@123')
    const { error } = await managerClient.rpc('set_audit_approval', {
      p_audit_id: auditId,
      p_status: 'approved',
      p_user_id: managerId,
      p_note: 'Second Approval',
    })

    expect(error).toBeTruthy()
    expect(error?.message).toMatch(/no longer awaiting approval/i)

    // The first approval's data must be untouched by the rejected second call.
    const status = await getAuditStatus(auditId)
    expect(status).toBe('APPROVED')
  })

  test('full cycle: auditor edits a rejected audit, resubmits, and manager approves it', async ({ page, browser }) => {
    // Only SUBMITTED→APPROVED/REJECTED are covered above. This exercises the
    // other half of the lifecycle: an auditor recovering from a REJECTED
    // audit by editing their answer in the wizard and resubmitting, then a
    // manager approving that resubmission — the path a real rejection cycle
    // actually takes, not just the two terminal transitions in isolation.
    test.setTimeout(180_000)

    const audit = await ensureAuditFor(auditorId, orgId, branchId, surveyId, { [questionId]: 'yes' })
    createdAuditIds.push(audit.id)
    await setAuditRejected(audit.id, managerId, 'Please double-check the fire exit photo.')

    // Auditor edits the flagged answer and resubmits via the wizard.
    await loginAsAuditor(page)
    await page.goto(`/audit/${audit.id}/wizard`, { waitUntil: 'networkidle' })

    const noAnswer = page.getByTestId(`answer-${questionId}-no`)
    await expect(noAnswer).toBeVisible({ timeout: 20_000 })
    await noAnswer.click()

    // Two "finish-audit" buttons render (mobile-only + desktop-only responsive
    // variants); at the default desktop viewport only the second is visible.
    const finishButton = page.getByTestId('finish-audit').last()
    await expect(finishButton).toBeEnabled({ timeout: 10_000 })
    await finishButton.click()

    await page.waitForURL(url => url.pathname.includes(`/audit/${audit.id}/summary`) || url.pathname.includes(`/audits/${audit.id}/summary`), { timeout: 30_000 })

    const submitButton = page.getByTestId('submit-for-approval')
    await expect(submitButton).toBeEnabled({ timeout: 20_000 })
    await submitButton.click()

    await expect
      .poll(async () => getAuditStatus(audit.id), { timeout: 30_000, intervals: [1_000] })
      .toBe('SUBMITTED')

    // Manager approves the resubmission — a fresh browser context, not the
    // auditor's page, since switching authenticated users mid-test on the
    // same page raced with in-flight session/redirect state during manual
    // verification.
    const managerContext = await browser.newContext()
    const managerPage = await managerContext.newPage()
    try {
      await loginAsBranchManager(managerPage)
      await managerPage.goto(`/audits/${audit.id}/summary`, { waitUntil: 'networkidle' })

      const approveButton = managerPage.getByRole('button', { name: /Approve/i }).first()
      await expect(approveButton).toBeVisible({ timeout: 20_000 })
      await approveButton.click()
      const modal = managerPage.getByRole('dialog')
      await expect(modal).toBeVisible({ timeout: 10_000 })
      await modal.getByPlaceholder(/Jane Manager/i).fill('Approved After Resubmission')
      await modal.getByRole('button', { name: /^Approve|Approving/i }).click()

      await expect
        .poll(async () => getAuditStatus(audit.id), { timeout: 30_000, intervals: [1_000] })
        .toBe('APPROVED')
    } finally {
      await managerContext.close()
    }
  })
})

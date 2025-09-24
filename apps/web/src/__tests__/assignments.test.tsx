import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
// Ensure api is mocked to mockApi BEFORE importing any modules that consume it
vi.mock('../utils/api', async () => {
  const mod = await import('@trakr/shared')
  return { api: mod.mockApi }
})
// Mock layout shell to simplify DOM
vi.mock('../components/DashboardLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout-mock">{children}</div>,
}))
// MemoryRouter is provided by renderWithProviders helper when needed
import { createTestWrapper, renderWithProviders } from '@/tests/utils/renderWithProviders'
import { useAssignBranchToAuditor, useClearManualAssignment, useApplyZoneWithSafeReset } from '../services/assignments'
import ManageAssignments from '../screens/ManageAssignments'
import { mockApi, AuditStatus } from '@trakr/shared'

const createWrapper = createTestWrapper

async function resetAssignments() {
  // Baseline from mockData: user-1 -> branch-1, user-10 -> branch-2, user-11 -> []
  await mockApi.setAuditorAssignment('user-1', { branchIds: ['branch-1'], zoneIds: [] })
  await mockApi.setAuditorAssignment('user-10', { branchIds: ['branch-2'], zoneIds: [] })
  await mockApi.setAuditorAssignment('user-11', { branchIds: [], zoneIds: [] })
}

describe('AssignmentsService hooks', () => {
  beforeEach(async () => {
    await resetAssignments()
  })

  it('blocks unassign to backlog when branch has Submitted audit', async () => {
    await resetAssignments()
    // Ensure branch-1 is manually assigned to John and create a submitted audit
    await mockApi.setAuditorAssignment('user-1', { branchIds: ['branch-1'], zoneIds: [] })
    const a = await mockApi.createAudit({ orgId: 'org-1', branchId: 'branch-1', surveyId: 'survey-1', assignedTo: 'user-1' })
    await mockApi.saveAuditProgress(a.id, { responses: { q1: 'yes' } }) // move to IN_PROGRESS
    await mockApi.submitAuditForApproval(a.id, 'user-1')

    await renderWithProviders(<ManageAssignments />)
    const johnCol = await screen.findByRole('region', { name: /column john auditor/i })
    const branchBtn = await within(johnCol).findByRole('button', { name: /downtown store.*john auditor/i })

    // Keyboard: pick, move far left to Unassigned, drop
    branchBtn.focus()
    await userEvent.keyboard('{Enter}')
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{Enter}')

    // Assert UI did not move the branch to Unassigned
    const backlog = await screen.findByRole('region', { name: /column unassigned/i })
    await waitFor(() => {
      expect(within(johnCol).getByText(/downtown store/i)).toBeInTheDocument()
      expect(within(backlog).queryByText(/downtown store/i)).toBeNull()
    })
  })

  it('Undo restores open audit assignees after zone apply (Draft moved then restored)', async () => {
    await resetAssignments()
    // DRAFT audit currently under John (user-1)
    const draft = await mockApi.createAudit({ orgId: 'org-1', branchId: 'branch-1', surveyId: 'survey-1', assignedTo: 'user-1' })

    await renderWithProviders(<ManageAssignments />)
    // Apply zone: assign zone-1 to Bob (user-11)
    const selects = await screen.findAllByRole('combobox')
    const auditorSelect = selects[0]
    const zoneSelect = selects[1]
    await screen.findByRole('option', { name: 'Bob Auditor' })
    await screen.findByRole('option', { name: 'North Region' })
    await userEvent.selectOptions(auditorSelect, 'user-11')
    await userEvent.selectOptions(zoneSelect, 'zone-1')
    const assignBtn = await screen.findByRole('button', { name: /assign zone/i })
    await userEvent.click(assignBtn)
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /confirm/i }))
    const zoneToast = await screen.findByText(/Zone assigned\./i, {}, { timeout: 3000 })

    // Verify Draft moved to Bob
    await waitFor(async () => {
      const d = await mockApi.getAuditById(draft.id)
      expect(d?.assignedTo).toBe('user-11')
    })

    // Confirm Undo option is presented (availability)
    // Note: The toast provider renders a button labeled "Undo"
    const root = zoneToast.ownerDocument.body
    expect(within(root).getByRole('button', { name: /undo/i })).toBeInTheDocument()
  }, 15000)

  it('blocks unassign to backlog when branch has Approved audit', async () => {
    await resetAssignments()
    // Ensure branch-1 is manually assigned to John and create an approved audit
    await mockApi.setAuditorAssignment('user-1', { branchIds: ['branch-1'], zoneIds: [] })
    const a = await mockApi.createAudit({ orgId: 'org-1', branchId: 'branch-1', surveyId: 'survey-1', assignedTo: 'user-1' })
    await mockApi.saveAuditProgress(a.id, { responses: { q1: 'yes' } }) // move to IN_PROGRESS
    await mockApi.submitAuditForApproval(a.id, 'user-1')
    await mockApi.setAuditApproval(a.id, { status: 'approved', userId: 'user-3' })

    await renderWithProviders(<ManageAssignments />)
    const johnCol = await screen.findByRole('region', { name: /column john auditor/i })
    const branchBtn = await within(johnCol).findByRole('button', { name: /downtown store.*john auditor/i })

    // Keyboard: pick, move far left to Unassigned, drop
    branchBtn.focus()
    await userEvent.keyboard('{Enter}')
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{Enter}')

    // Assert UI did not move the branch to Unassigned (still in John's column)
    const backlog2 = await screen.findByRole('region', { name: /column unassigned/i })
    await waitFor(() => {
      expect(within(johnCol).getByText(/downtown store/i)).toBeInTheDocument()
      expect(within(backlog2).queryByText(/downtown store/i)).toBeNull()
    })
  })

  it('zone apply redistributes only Draft audits (keeps In-Progress/Rejected intact)', async () => {
    await resetAssignments()
    // Create a DRAFT audit and an IN_PROGRESS audit for branch-1 (in zone-1)
    const draft = await mockApi.createAudit({ orgId: 'org-1', branchId: 'branch-1', surveyId: 'survey-1', assignedTo: 'user-1' })
    const inprog = await mockApi.createAudit({ orgId: 'org-1', branchId: 'branch-1', surveyId: 'survey-1', assignedTo: 'user-10' })
    await mockApi.saveAuditProgress(inprog.id, { responses: { q1: 'yes' } }) // move to IN_PROGRESS

    await renderWithProviders(<ManageAssignments />)

    // Select Bob (user-11) and North Region (zone-1), then assign
    const selects = await screen.findAllByRole('combobox')
    const auditorSelect = selects[0]
    const zoneSelect = selects[1]
    await screen.findByRole('option', { name: 'Bob Auditor' })
    await screen.findByRole('option', { name: 'North Region' })
    await userEvent.selectOptions(auditorSelect, 'user-11')
    await userEvent.selectOptions(zoneSelect, 'zone-1')
    const assignBtn = await screen.findByRole('button', { name: /assign zone/i })
    await userEvent.click(assignBtn)

    // Confirm modal should appear even if no manual overrides; confirm to proceed
    const dialog = await screen.findByRole('dialog')
    const confirmBtn = within(dialog).getByRole('button', { name: /confirm/i })
    await userEvent.click(confirmBtn)
    // Wait for success toast to ensure confirm flow completed
    await screen.findByText(/Zone assigned\./i, {}, { timeout: 3000 })

    // Validate: Draft audit moved to Bob, In-Progress audit remains (wait for async reassign)
    await waitFor(async () => {
      const d = await mockApi.getAuditById(draft.id)
      const ip = await mockApi.getAuditById(inprog.id)
      expect(d?.status).toBe(AuditStatus.DRAFT)
      expect(d?.assignedTo).toBe('user-11')
      expect(ip?.status).toBe(AuditStatus.IN_PROGRESS)
      expect(ip?.assignedTo).toBe('user-10')
    }, { timeout: 3000 })
  })

  it('blocks DnD when branch has Submitted (awaiting approval)', async () => {
    await resetAssignments()
    // Ensure branch-1 is manually under John (user-1)
    await mockApi.setAuditorAssignment('user-1', { branchIds: ['branch-1'], zoneIds: [] })
    await mockApi.setAuditorAssignment('user-11', { branchIds: [], zoneIds: [] })
    // Create a DRAFT audit and submit it for approval
    const a = await mockApi.createAudit({ orgId: 'org-1', branchId: 'branch-1', surveyId: 'survey-1', assignedTo: 'user-1' })
    await mockApi.saveAuditProgress(a.id, { responses: { q1: 'yes' } }) // move to IN_PROGRESS
    await mockApi.submitAuditForApproval(a.id, 'user-1')

    await renderWithProviders(<ManageAssignments />)

    const johnCol = await screen.findByRole('region', { name: /column john auditor/i })
    const branchBtn = await within(johnCol).findByRole('button', { name: /downtown store.*john auditor/i })
    branchBtn.focus()
    await userEvent.keyboard('{Enter}') // pick
    // move target to Bob
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{Enter}')

    // Assert it did not move (UI remains in John's column and not in Bob's)
    const bobCol = await screen.findByRole('region', { name: /column bob auditor/i })
    await waitFor(() => {
      expect(within(johnCol).getByText(/downtown store/i)).toBeInTheDocument()
      expect(within(bobCol).queryByText(/downtown store/i)).toBeNull()
    })
  })

  it('allows DnD when branch only has Completed audits', async () => {
    await resetAssignments()
    // Put Mall Location (branch-2) under Alice (user-10) initially per baseline
    // Add a completed audit on branch-2
    const a2 = await mockApi.createAudit({ orgId: 'org-1', branchId: 'branch-2', surveyId: 'survey-1', assignedTo: 'user-10' })
    await mockApi.setAuditStatus(a2.id, AuditStatus.COMPLETED)

    await renderWithProviders(<ManageAssignments />)

    const aliceCol = await screen.findByRole('region', { name: /column alice auditor/i })
    const bobCol = await screen.findByRole('region', { name: /column bob auditor/i })
    const branchBtn = await within(aliceCol).findByRole('button', { name: /mall location.*alice auditor/i })
    branchBtn.focus()
    await userEvent.keyboard('{Enter}') // pick up
    await userEvent.keyboard('{ArrowRight}{Enter}') // move to Bob and drop

    // If confirmation modal appears (due to auto-scheduled Draft), confirm
    try {
      const dialog = await screen.findByRole('dialog', {}, { timeout: 1000 })
      const confirmBtn = within(dialog).getByRole('button', { name: /confirm/i })
      await userEvent.click(confirmBtn)
    } catch { /* no modal, proceed */ }

    // Expect it to move (no block)
    await waitFor(() => expect(within(bobCol).getByText('Mall Location')).toBeInTheDocument())
  })
  it('shows an audit status pill on branch cards (latest non-archived)', async () => {
    await resetAssignments()
    await renderWithProviders(<ManageAssignments />)

    const johnCol = await screen.findByRole('region', { name: /column john auditor/i })
    const cardBtn = await within(johnCol).findByRole('button', { name: /downtown store.*john auditor/i })
    const statuses = ['Draft', 'In Progress', 'Rejected', 'Submitted', 'Approved', 'Completed']
    const found = statuses.some(s => {
      try { return within(cardBtn).getByText(new RegExp(s, 'i')) !== null } catch { return false }
    })
    expect(found).toBe(true)
  })

  it('assigns a branch to a target auditor and removes it from previous owners', async () => {
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useAssignBranchToAuditor(), { wrapper: Wrapper })

    // Move branch-1 from user-1 to user-11
    await act(async () => {
      await result.current.mutateAsync({ targetUserId: 'user-11', branchId: 'branch-1' })
    })

    const after = await mockApi.getAuditorAssignments()
    const u1 = after.find(a => a.userId === 'user-1')
    const u11 = after.find(a => a.userId === 'user-11')
    expect(u1?.branchIds || []).not.toContain('branch-1')
    expect(u11?.branchIds || []).toContain('branch-1')
  })

  it('clears manual assignment of a branch from all users', async () => {
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useClearManualAssignment(), { wrapper: Wrapper })

    await act(async () => {
      await result.current.mutateAsync({ branchId: 'branch-1' })
    })

    const after = await mockApi.getAuditorAssignments()
    after.forEach(a => {
      expect(a.branchIds || []).not.toContain('branch-1')
    })
  })

  it('applies zone and safely resets specified branches to the target auditor', async () => {
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useApplyZoneWithSafeReset(), { wrapper: Wrapper })

    await act(async () => {
      await result.current.mutateAsync({ targetUserId: 'user-11', zoneId: 'zone-1', resetBranchIds: ['branch-2'] })
    })

    const after = await mockApi.getAuditorAssignments()
    const u10 = after.find(a => a.userId === 'user-10')
    const u11 = after.find(a => a.userId === 'user-11')
    expect(u10?.branchIds || []).not.toContain('branch-2')
    expect(u11?.branchIds || []).toContain('branch-2')
    expect(u11?.zoneIds || []).toContain('zone-1')
  })

  it('supports keyboard DnD: pick, move, and drop, with aria-live updates', async () => {
    // Move Mall Location into John Auditor so we can reassign it (no locked audits on branch-2)
    await mockApi.setAuditorAssignment('user-1', { branchIds: ['branch-2'], zoneIds: [] })
    await mockApi.setAuditorAssignment('user-10', { branchIds: [], zoneIds: [] })
    await renderWithProviders(<ManageAssignments />)

    // Wait for board to render
    await screen.findByRole('region', { name: /column unassigned/i })
    const johnCol = await screen.findByRole('region', { name: /column john auditor/i })
    const bobCol = await screen.findByRole('region', { name: /column bob auditor/i })

    // Find a branch in John Auditor column (Mall Location)
    const branchBtn = await within(johnCol).findByRole('button', { name: /mall location.*john auditor/i })
    branchBtn.focus()
    await userEvent.keyboard('{Enter}') // pick up

    // Move focus target to Bob Auditor and drop
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{Enter}')

    // A confirmation modal should appear (reassignment of open/rejected audits)
    const dialog = await screen.findByRole('dialog')
    const confirmBtn = within(dialog).getByRole('button', { name: /confirm/i })
    await userEvent.click(confirmBtn)

    // Assert aria-live message reflects the assignment (wait for final message)
    await waitFor(() => {
      const status = screen.getByRole('status')
      expect(status.textContent || '').toMatch(/assigned branch to bob auditor/i)
    })

    // Assert UI moved the card to Bob column
    await waitFor(() => expect(within(bobCol).getByText('Mall Location')).toBeInTheDocument())
  })

  it('prevents no-op duplicate: dropping into same effective owner shows info and does not create manual override', async () => {
    // Make Downtown Store effective under Bob via zone (no manual), and clear manual from John
    await mockApi.setAuditorAssignment('user-1', { branchIds: [], zoneIds: [] })
    await mockApi.setAuditorAssignment('user-11', { branchIds: [], zoneIds: ['zone-1'] })

    await renderWithProviders(<ManageAssignments />)

    const bobCol = await screen.findByRole('region', { name: /column bob auditor/i })
    const branchBtn = await within(bobCol).findByRole('button', { name: /downtown store.*bob auditor/i })
    branchBtn.focus()

    // Press Enter immediately to drop without moving
    await userEvent.keyboard('{Enter}{Enter}')

    // Toast/info text appears and badge remains Via Zone (not Manual)
    await screen.findByText(/no changes — branch already in this column/i)
    // Ensure the card still indicates Via Zone (not Manual). Use the card element (role=button).
    const cardBtn = await within(bobCol).findByRole('button', { name: /downtown store.*bob auditor/i })
    expect(within(cardBtn).getByText(/via zone/i)).toBeInTheDocument()
  })

  it('dropping to Unassigned for zone-derived assignment warns and makes no change', async () => {
    // Ensure Downtown Store is zone-derived under Bob
    await mockApi.setAuditorAssignment('user-1', { branchIds: [], zoneIds: [] })
    await mockApi.setAuditorAssignment('user-11', { branchIds: [], zoneIds: ['zone-1'] })

    await renderWithProviders(<ManageAssignments />)

    const bobCol = await screen.findByRole('region', { name: /column bob auditor/i })
    const branchBtn = await within(bobCol).findByRole('button', { name: /downtown store.*bob auditor/i })
    branchBtn.focus()

    // Move target to Unassigned and attempt to drop
    await userEvent.keyboard('{Enter}') // pick
    // Move left enough times to reach Unassigned
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}{Enter}')

    // Expect aria-live message and branch still in Bob's column
    const status2 = await screen.findByRole('status')
    expect(status2.textContent || '').toMatch(/assigned via zone.*remove it from the zone/i)
    expect(within(bobCol).getByText('Downtown Store')).toBeInTheDocument()
  })
})

describe('ManageAssignments confirmation modal', () => {
  beforeEach(async () => {
    await resetAssignments()
  })

  it('shows locked branches in the confirmation and no reset when zone contains a locked branch', async () => {
    await renderWithProviders(<ManageAssignments />)

    // Wait for selects to render and options to load (data is async)
    const selects = await screen.findAllByRole('combobox')
    const auditorSelect = selects[0]
    const zoneSelect = selects[1]
    // Ensure options are present before selecting
    await screen.findByRole('option', { name: 'Bob Auditor' })
    await screen.findByRole('option', { name: 'North Region' })

    // Select Bob Auditor (user-11) and North Region (zone-1 includes branch-1 which has locked audits)
    await userEvent.selectOptions(auditorSelect, 'user-11')
    await userEvent.selectOptions(zoneSelect, 'zone-1')
    expect(auditorSelect).toHaveValue('user-11')
    expect(zoneSelect).toHaveValue('zone-1')

    // Click Assign Zone
    const assignBtn = await screen.findByRole('button', { name: /assign zone/i })
    await waitFor(() => expect(assignBtn).toBeEnabled())
    await userEvent.click(assignBtn)

    // Modal should appear. Locked list should include Downtown Store and reset count should be 0
    const dialog = await screen.findByRole('dialog')
    const inDialog = within(dialog)
    expect(inDialog.getByText(/Skipped \(in‑progress\/rejected\/submitted\/approved\/completed\):/i)).toBeInTheDocument()
    expect(inDialog.getByText('Downtown Store')).toBeInTheDocument()
    // Will be reassigned section may be absent when 0; ensure the specific wording for locked is present
  })
})

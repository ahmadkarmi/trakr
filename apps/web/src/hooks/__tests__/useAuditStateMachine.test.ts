import { describe, it, expect } from 'vitest'
import { AuditStatus, UserRole } from '@trakr/shared'
import { useAuditStateMachine } from '../useAuditStateMachine'

// Pure function despite the use- prefix: no React state, safe to call directly.
describe('useAuditStateMachine', () => {
  describe('AUDITOR', () => {
    it('DRAFT below 100% can edit/delete but not submit', () => {
      const p = useAuditStateMachine(AuditStatus.DRAFT, UserRole.AUDITOR, 40)
      expect(p.canEdit).toBe(true)
      expect(p.canDelete).toBe(true)
      expect(p.canSubmit).toBe(false)
      expect(p.nextAction).toContain('60%')
    })

    it('DRAFT at 100% can submit', () => {
      const p = useAuditStateMachine(AuditStatus.DRAFT, UserRole.AUDITOR, 100)
      expect(p.canSubmit).toBe(true)
    })

    it('SUBMITTED is view-only and locked', () => {
      const p = useAuditStateMachine(AuditStatus.SUBMITTED, UserRole.AUDITOR, 100)
      expect(p.canEdit).toBe(false)
      expect(p.canViewOnly).toBe(true)
      expect(p.canSubmit).toBe(false)
      expect(p.showWarning).toMatch(/awaiting manager review/i)
    })

    it('REJECTED reopens editing and allows resubmit at 100%', () => {
      const p = useAuditStateMachine(AuditStatus.REJECTED, UserRole.AUDITOR, 100)
      expect(p.canEdit).toBe(true)
      expect(p.canSubmit).toBe(true)
      expect(p.warningType).toBe('warning')
    })

    it('APPROVED is terminal for the auditor', () => {
      const p = useAuditStateMachine(AuditStatus.APPROVED, UserRole.AUDITOR, 100)
      expect(p.canEdit).toBe(false)
      expect(p.canViewOnly).toBe(true)
      expect(p.nextAction).toBeNull()
    })
  })

  describe('BRANCH_MANAGER', () => {
    it('cannot edit at any reviewable status', () => {
      for (const status of [
        AuditStatus.DRAFT,
        AuditStatus.IN_PROGRESS,
        AuditStatus.COMPLETED,
        AuditStatus.SUBMITTED,
        AuditStatus.APPROVED,
        AuditStatus.REJECTED,
      ]) {
        const p = useAuditStateMachine(status, UserRole.BRANCH_MANAGER, 100)
        expect(p.canEdit).toBe(false)
        expect(p.canViewOnly).toBe(true)
      }
    })

    it('SUBMITTED prompts the review action', () => {
      const p = useAuditStateMachine(AuditStatus.SUBMITTED, UserRole.BRANCH_MANAGER, 100)
      expect(p.nextAction).toMatch(/approve or reject/i)
    })
  })

  describe('ADMIN / SUPER_ADMIN', () => {
    it('can edit and delete only pre-submission audits', () => {
      for (const role of [UserRole.ADMIN, UserRole.SUPER_ADMIN]) {
        const draft = useAuditStateMachine(AuditStatus.DRAFT, role, 10)
        expect(draft.canEdit).toBe(true)
        expect(draft.canDelete).toBe(true)

        const submitted = useAuditStateMachine(AuditStatus.SUBMITTED, role, 100)
        expect(submitted.canEdit).toBe(false)
        expect(submitted.canDelete).toBe(false)
      }
    })
  })

  it('labels every status', () => {
    for (const status of Object.values(AuditStatus)) {
      const p = useAuditStateMachine(status, UserRole.AUDITOR, 0)
      expect(p.statusLabel).toBeTruthy()
    }
  })
})

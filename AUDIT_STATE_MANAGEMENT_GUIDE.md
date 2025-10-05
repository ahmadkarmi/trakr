# Audit State Management - Usage Guide

This guide shows you how to use the new audit state management system in your components.

## What Was Built

✅ **5 new files created:**
1. `hooks/useAuditStateMachine.ts` - Permission rules based on status
2. `hooks/useAuditProgress.ts` - Completion tracking
3. `components/AuditStatusBanner.tsx` - Visual feedback banners
4. `components/AuditActionGuard.tsx` - Permission guards for UI elements
5. `hooks/useAuditAutoSave.ts` - Auto-save functionality

---

## Quick Start: Integrate into AuditWizard

### Step 1: Import the hooks and components

```typescript
// In apps/web/src/screens/AuditWizard.tsx
import { useAuditStateMachine } from '../hooks/useAuditStateMachine'
import { useAuditProgress } from '../hooks/useAuditProgress'
import { useAuditAutoSave } from '../hooks/useAuditAutoSave'
import { AuditStatusBanner } from '../components/AuditStatusBanner'
import { AuditActionGuard, AuditActionButton } from '../components/AuditActionGuard'
```

### Step 2: Use the hooks in your component

```typescript
export function AuditWizard() {
  const { user } = useAuthStore()
  const { auditId } = useParams()
  
  // Fetch audit and survey data (you already have this)
  const { data: audit } = useQuery({ ... })
  const { data: survey } = useQuery({ ... })
  
  // NEW: Add these hooks
  const progress = useAuditProgress(audit, survey)
  const permissions = useAuditStateMachine(
    audit?.status || AuditStatus.DRAFT,
    user?.role || UserRole.AUDITOR,
    progress.completionPercent
  )
  const { saveAnswer, isSaving, lastSaved } = useAuditAutoSave({
    auditId: auditId!,
    enabled: permissions.canEdit, // Only auto-save if user can edit
  })

  // Your existing answer handler - just add auto-save
  const handleAnswerChange = (questionId: string, answer: any) => {
    // Save locally (your existing logic)
    setLocalAnswers(prev => ({ ...prev, [questionId]: answer }))
    
    // NEW: Auto-save to server (debounced)
    saveAnswer(questionId, answer)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* NEW: Status banner at the top */}
      <AuditStatusBanner 
        permissions={permissions}
        completionPercent={progress.completionPercent}
        className="mb-6"
      />

      {/* NEW: Show auto-save indicator */}
      <div className="mb-4 text-sm text-gray-600">
        {isSaving && <span>💾 Saving...</span>}
        {lastSaved && !isSaving && (
          <span>✓ Saved {formatRelativeTime(lastSaved)}</span>
        )}
      </div>

      {/* Your existing survey sections */}
      {survey?.sections.map(section => (
        <div key={section.id}>
          <h2>{section.title}</h2>
          
          {/* Show section progress */}
          <div className="mb-2">
            {progress.sectionProgress.find(s => s.sectionId === section.id)?.percent}% complete
          </div>

          {section.questions.map(question => (
            <div key={question.id}>
              {/* NEW: Guard edit functionality */}
              <AuditActionGuard permissions={permissions} action="edit">
                <input
                  value={answers[question.id] || ''}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                />
              </AuditActionGuard>

              {/* NEW: Show read-only view if can't edit */}
              <AuditActionGuard permissions={permissions} action="edit" fallback={
                <div className="text-gray-600">{answers[question.id]}</div>
              } />
            </div>
          ))}
        </div>
      ))}

      {/* NEW: Guard submit button */}
      <AuditActionGuard permissions={permissions} action="submit">
        <button
          onClick={handleSubmit}
          className="btn btn-primary"
        >
          Submit for Review
        </button>
      </AuditActionGuard>

      {/* Alternative: Show disabled submit button with tooltip */}
      <AuditActionButton 
        permissions={permissions} 
        action="submit"
        disabledMessage="Complete all questions to submit"
      >
        <button className="btn btn-primary">
          Submit for Review
        </button>
      </AuditActionButton>
    </div>
  )
}
```

---

## Usage in Dashboard (List View)

```typescript
// In apps/web/src/screens/DashboardAuditor.tsx
import { useAuditStateMachine } from '../hooks/useAuditStateMachine'
import { useAuditProgress } from '../hooks/useAuditProgress'
import { AuditStatusBadge } from '../components/AuditStatusBanner'

export function DashboardAuditor() {
  const { data: audits } = useQuery({ ... })
  const { data: surveys } = useQuery({ ... })

  return (
    <div className="grid gap-4">
      {audits.map(audit => {
        const survey = surveys.find(s => s.id === audit.surveyId)
        const progress = useAuditProgress(audit, survey)
        const permissions = useAuditStateMachine(
          audit.status,
          user.role,
          progress.completionPercent
        )

        return (
          <div key={audit.id} className="card">
            <div className="flex items-center justify-between">
              <h3>{audit.title}</h3>
              
              {/* Compact status badge */}
              <AuditStatusBadge permissions={permissions} />
            </div>

            {/* Progress bar */}
            <div className="mt-2">
              <div className="text-sm text-gray-600">
                {progress.completionPercent}% complete
              </div>
              <div className="w-full bg-gray-200 rounded h-2">
                <div 
                  className="bg-blue-500 h-2 rounded"
                  style={{ width: `${progress.completionPercent}%` }}
                />
              </div>
            </div>

            {/* Action buttons based on permissions */}
            <div className="mt-4 flex gap-2">
              <AuditActionGuard permissions={permissions} action="edit">
                <button onClick={() => navigate(`/audit/${audit.id}/wizard`)}>
                  Continue Editing
                </button>
              </AuditActionGuard>

              <AuditActionGuard permissions={permissions} action="view">
                <button onClick={() => navigate(`/audit/${audit.id}`)}>
                  View Details
                </button>
              </AuditActionGuard>

              <AuditActionGuard permissions={permissions} action="delete">
                <button onClick={() => handleDelete(audit.id)} className="btn-danger">
                  Delete
                </button>
              </AuditActionGuard>
            </div>

            {/* Show next action hint */}
            {permissions.nextAction && (
              <div className="mt-2 text-sm text-blue-600">
                → {permissions.nextAction}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

---

## Advanced: Section-Level Guards

Hide entire sections based on permissions:

```typescript
import { AuditSectionGuard } from '../components/AuditActionGuard'

<AuditSectionGuard permissions={permissions} show="edit">
  {/* This entire section only shows if user can edit */}
  <div className="edit-controls">
    <button>Save Draft</button>
    <button>Delete Audit</button>
  </div>
</AuditSectionGuard>

<AuditSectionGuard permissions={permissions} show="viewOnly">
  {/* This only shows when viewing (can't edit) */}
  <div className="bg-yellow-50 p-4">
    This audit is locked and cannot be edited.
  </div>
</AuditSectionGuard>
```

---

## Progress Tracking Examples

### Show "Next Unanswered Question" Button

```typescript
const progress = useAuditProgress(audit, survey)

{progress.nextUnanswered && (
  <button onClick={() => scrollToQuestion(progress.nextUnanswered.questionId)}>
    Jump to next unanswered: {progress.nextUnanswered.sectionTitle}
  </button>
)}
```

### Show Section-by-Section Progress

```typescript
{progress.sectionProgress.map(section => (
  <div key={section.sectionId}>
    <h3>{section.sectionTitle}</h3>
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 h-2 rounded">
        <div 
          className={`h-2 rounded ${section.isComplete ? 'bg-green-500' : 'bg-blue-500'}`}
          style={{ width: `${section.percent}%` }}
        />
      </div>
      <span className="text-sm">{section.answered}/{section.total}</span>
      {section.isComplete && <span>✓</span>}
    </div>
  </div>
))}
```

---

## Auto-Save Examples

### Basic Auto-Save

```typescript
const { saveAnswer, isSaving, lastSaved } = useAuditAutoSave({
  auditId: audit.id,
  debounceMs: 2000, // Wait 2 seconds after typing stops
  enabled: permissions.canEdit, // Only if user can edit
})

// In your input handler:
<input
  value={answer}
  onChange={(e) => {
    setAnswer(e.target.value)
    saveAnswer(questionId, e.target.value) // Auto-saves after 2s
  }}
/>
```

### Manual Save with Auto-Save Fallback

```typescript
const { saveAnswer, saveNow, isSaving } = useAuditAutoSave({ auditId })

// Auto-saves as user types
const handleChange = (qId, value) => {
  setAnswers(prev => ({ ...prev, [qId]: value }))
  saveAnswer(qId, value)
}

// Manual save button (saves immediately, no debounce)
<button onClick={saveNow} disabled={isSaving}>
  {isSaving ? 'Saving...' : 'Save Now'}
</button>
```

---

## Testing the System

### Test Different Audit States

```typescript
// Create test audits in different states
const testAudits = [
  { id: '1', status: AuditStatus.DRAFT, answers: {} }, // 0% complete
  { id: '2', status: AuditStatus.IN_PROGRESS, answers: { q1: 'answer' } }, // 50% complete
  { id: '3', status: AuditStatus.COMPLETED, answers: { q1: 'a', q2: 'b' } }, // 100%
  { id: '4', status: AuditStatus.SUBMITTED, answers: { q1: 'a', q2: 'b' } },
  { id: '5', status: AuditStatus.REJECTED, answers: { q1: 'a', q2: 'b' } },
  { id: '6', status: AuditStatus.APPROVED, answers: { q1: 'a', q2: 'b' } },
]

// Check permissions for each
testAudits.forEach(audit => {
  const permissions = useAuditStateMachine(audit.status, UserRole.AUDITOR, 50)
  console.log(audit.status, permissions)
})
```

---

## Migration Checklist

✅ **Step 1:** Import hooks and components into `AuditWizard.tsx`  
✅ **Step 2:** Add `AuditStatusBanner` to the top of the wizard  
✅ **Step 3:** Wrap edit inputs with `AuditActionGuard`  
✅ **Step 4:** Wrap submit button with `AuditActionGuard`  
✅ **Step 5:** Add auto-save to answer change handlers  
✅ **Step 6:** Add status badges to dashboard audit cards  
✅ **Step 7:** Add progress bars to dashboard  
✅ **Step 8:** Test all audit states (draft → submitted → approved)

---

## Benefits

✅ **Single Source of Truth** - All permission logic in one place  
✅ **Consistent UX** - Same behavior across all screens  
✅ **Easy to Change** - Modify rules in one hook, not 20 components  
✅ **Better DX** - Clear, readable component code  
✅ **Testable** - Each piece can be unit tested  
✅ **Auto-Save** - Never lose work  
✅ **Visual Feedback** - Users always know what to do next

---

## Questions?

- **Q: Can I customize the state machine rules?**  
  A: Yes! Edit `useAuditStateMachine.ts` to change what's allowed in each state.

- **Q: Can I disable auto-save?**  
  A: Yes! Set `enabled: false` or just don't use the hook.

- **Q: Can managers edit audits?**  
  A: Currently no (they review only). Change the state machine if you want this.

- **Q: What if I want different rules for different surveys?**  
  A: Add a `surveyType` parameter to `useAuditStateMachine` and add custom logic.

# Toast Notifications Implementation Plan

## ✅ COMPLETED - All Toast Implementations Done!

### Already Had Toasts
- **ManageZones** - Create, Update, Delete zones ✅
- **ManageBranches** - Create, Delete branches ✅
- **ManageSurveyTemplates** - All CRUD operations ✅
- **AuditSummary** - Approve, Reject audits ✅  
- **ManageAssignments** - Zone assignments, Branch assignments ✅

### Newly Implemented
- **Settings** - Profile & Organization updates ✅
- **ProfileSignature** - Save & Clear signature ✅
- **SurveyTemplateEditor** - Survey updates ✅
- **ManageUsers** - All user management operations ✅

## 🔴 Previous Status (Now Complete)

### 1. **ManageBranches** (`apps/web/src/screens/ManageBranches.tsx`)
**Current State:** No toasts
**Operations:**
- ✅ Create branch
- ❌ Delete branch → Need success/error toasts

### 2. **ManageSurveyTemplates** (`apps/web/src/screens/ManageSurveyTemplates.tsx`)
**Current State:** No toasts
**Operations:**
- ❌ Create survey → "Survey created successfully!"
- ❌ Duplicate survey → "Survey duplicated successfully!"
- ❌ Delete survey → "Survey deleted successfully!"
- ❌ Toggle active status → "Survey activated/deactivated!"
- ❌ Update frequency → "Survey frequency updated!"

### 3. **SurveyTemplateEditor** (`apps/web/src/screens/SurveyTemplateEditor.tsx`)
**Current State:** No toasts
**Operations:**
- ❌ Update survey → "Survey updated successfully!"
- ❌ Add/remove sections → "Section added/removed!"
- ❌ Add/remove questions → "Question added/removed!"

### 4. **Settings** (`apps/web/src/screens/Settings.tsx`)
**Current State:** No toasts
**Operations:**
- ❌ Update profile → "Profile updated successfully!"
- ❌ Update organization → "Organization settings updated!"
- ❌ Change timezone → "Timezone updated!"
- ❌ Change gating policy → "Gating policy updated!"

### 5. **ProfileSignature** (`apps/web/src/screens/ProfileSignature.tsx`)
**Current State:** No toasts  
**Operations:**
- ❌ Save signature → "Signature saved successfully!"
- ❌ Clear signature → "Signature cleared!"

### 6. **ManageUsers** (`apps/web/src/screens/ManageUsers.tsx`)
**Current State:** No toasts (TODOs exist)
**Operations:**
- ❌ Invite user → "User invited successfully!"
- ❌ Update user → "User updated successfully!"
- ❌ Delete user → "User deleted successfully!"
- ❌ Resend invitation → "Invitation resent!"

## 📋 Toast Message Templates

### Success Messages
```typescript
// Create operations
`${ItemType} "${name}" created successfully!`

// Update operations  
`${ItemType} "${name}" updated successfully!`

// Delete operations
`${ItemType} "${name}" deleted successfully!`

// Toggle operations
`${ItemType} "${name}" ${newState}!`

// Specific actions
"Profile updated successfully!"
"Signature saved successfully!"
"Invitation sent to {email}!"
```

### Error Messages
```typescript
// Generic error
`Failed to ${action} ${itemType}. Please try again.`

// Specific error (with error message)
error instanceof Error ? error.message : `Failed to ${action} ${itemType}.`
```

## 🎯 Priority Order

1. **HIGH:** ManageSurveyTemplates (most used CRUD operations)
2. **HIGH:** Settings (profile/org updates are critical)
3. **MEDIUM:** ManageBranches (delete operations)
4. **MEDIUM:** SurveyTemplateEditor (complex form updates)
5. **MEDIUM:** ProfileSignature (user experience)
6. **LOW:** ManageUsers (admin-only, less frequently used)

## 📝 Implementation Pattern

```typescript
import { useToast } from '../hooks/useToast'

const MyComponent = () => {
  const { showToast } = useToast()
  
  const mutation = useMutation({
    mutationFn: async (data) => api.doSomething(data),
    onSuccess: (result) => {
      // invalidate queries
      showToast({ 
        message: 'Operation completed successfully!', 
        variant: 'success' 
      })
    },
    onError: (error) => {
      showToast({ 
        message: error instanceof Error ? error.message : 'Operation failed.', 
        variant: 'error' 
      })
    },
  })
}
```

## 🔄 Next Steps

1. Implement toasts in ManageSurveyTemplates (most impact)
2. Add toasts to Settings page
3. Complete ManageBranches toasts
4. Add SurveyTemplateEditor toasts
5. Implement ProfileSignature toasts
6. Complete ManageUsers toasts (when APIs are implemented)

import { useEffect, useRef, useCallback, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../utils/api'
import { QK } from '../utils/queryKeys'

interface AutoSaveOptions {
  auditId: string
  debounceMs?: number
  enabled?: boolean
}

interface AutoSaveState {
  isSaving: boolean
  lastSaved: Date | null
  hasUnsavedChanges: boolean
  error: Error | null
}

/**
 * Hook that provides auto-save functionality for audit answers
 * Debounces saves to avoid hammering the API on every keystroke
 * 
 * Usage:
 * const { saveAnswer, isSaving, lastSaved } = useAuditAutoSave({ auditId: audit.id })
 * 
 * // When user answers a question:
 * saveAnswer(questionId, answer)
 */
export function useAuditAutoSave({ 
  auditId, 
  debounceMs = 2000,
  enabled = true 
}: AutoSaveOptions) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<AutoSaveState>({
    isSaving: false,
    lastSaved: null,
    hasUnsavedChanges: false,
    error: null,
  })
  
  // Store pending changes
  const pendingChangesRef = useRef<Record<string, any>>({})
  const saveTimeoutRef = useRef<NodeJS.Timeout>()
  const isMountedRef = useRef(true)

  // Mutation to save answers
  const saveMutation = useMutation({
    mutationFn: (answers: Record<string, any>) => 
      api.saveAuditProgress(auditId, { responses: answers }),
    onMutate: () => {
      if (isMountedRef.current) {
        setState(prev => ({ ...prev, isSaving: true, error: null }))
      }
    },
    onSuccess: () => {
      if (isMountedRef.current) {
        setState(prev => ({ 
          ...prev, 
          isSaving: false, 
          lastSaved: new Date(),
          hasUnsavedChanges: false,
          error: null
        }))
      }
      // Invalidate queries to refresh the audit data
      queryClient.invalidateQueries({ queryKey: QK.AUDITS() })
    },
    onError: (error: Error) => {
      if (isMountedRef.current) {
        setState(prev => ({ 
          ...prev, 
          isSaving: false,
          error 
        }))
      }
      console.error('[AutoSave] Failed to save audit:', error)
    }
  })

  // Debounced save function
  const debouncedSave = useCallback(() => {
    if (!enabled) return

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout
    saveTimeoutRef.current = setTimeout(() => {
      if (Object.keys(pendingChangesRef.current).length > 0) {
        // Save the pending changes
        saveMutation.mutate({ ...pendingChangesRef.current })
        // Clear pending changes
        pendingChangesRef.current = {}
      }
    }, debounceMs)
  }, [enabled, debounceMs, saveMutation])

  // Main function to save a single answer
  const saveAnswer = useCallback((questionId: string, answer: any) => {
    if (!enabled) return

    // Add to pending changes
    pendingChangesRef.current[questionId] = answer
    
    // Mark as having unsaved changes
    setState(prev => ({ ...prev, hasUnsavedChanges: true }))
    
    // Trigger debounced save
    debouncedSave()
  }, [enabled, debouncedSave])

  // Function to save immediately (bypass debounce)
  const saveNow = useCallback(() => {
    if (!enabled) return

    // Clear debounce timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Save immediately if there are pending changes
    if (Object.keys(pendingChangesRef.current).length > 0) {
      saveMutation.mutate({ ...pendingChangesRef.current })
      pendingChangesRef.current = {}
    }
  }, [enabled, saveMutation])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      
      // Cancel any pending debounced save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      
      // Optionally save remaining changes on unmount
      // (Commented out to avoid race conditions - you can enable if needed)
      // if (Object.keys(pendingChangesRef.current).length > 0) {
      //   api.updateAudit(auditId, { answers: pendingChangesRef.current })
      // }
    }
  }, [])

  return {
    saveAnswer,
    saveNow,
    isSaving: state.isSaving,
    lastSaved: state.lastSaved,
    hasUnsavedChanges: state.hasUnsavedChanges,
    error: state.error,
  }
}

/**
 * Simpler version that just tracks save state without auto-save
 * Useful when you want manual save control with visual feedback
 */
export function useAuditSave(auditId: string) {
  const queryClient = useQueryClient()
  
  const saveMutation = useMutation({
    mutationFn: (answers: Record<string, any>) => 
      api.saveAuditProgress(auditId, { responses: answers }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.AUDITS() })
    }
  })

  const save = useCallback((answers: Record<string, any>) => {
    return saveMutation.mutateAsync(answers)
  }, [saveMutation])

  return {
    save,
    isSaving: saveMutation.isPending,
    isSuccess: saveMutation.isSuccess,
    error: saveMutation.error,
  }
}

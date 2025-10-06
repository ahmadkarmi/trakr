/**
 * Optimistic UI update utilities
 * Provides instant feedback before server confirmation
 */

import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

interface OptimisticUpdateOptions<TData, TVariables> {
  queryKey: readonly unknown[]
  mutationFn: (variables: TVariables) => Promise<TData>
  updateFn: (oldData: TData | undefined, variables: TVariables) => TData
  onSuccess?: (data: TData, variables: TVariables) => void
  onError?: (error: unknown, variables: TVariables, context: { previousData?: TData }) => void
}

/**
 * Hook for optimistic updates with automatic rollback on error
 * 
 * @example
 * ```tsx
 * const updateNotification = useOptimisticUpdate({
 *   queryKey: QK.NOTIFICATIONS,
 *   mutationFn: (id) => api.markAsRead(id),
 *   updateFn: (oldData, id) => 
 *     oldData?.map(n => n.id === id ? { ...n, isRead: true } : n),
 * })
 * ```
 */
export function useOptimisticUpdate<TData, TVariables>({
  queryKey,
  mutationFn,
  updateFn,
  onSuccess,
  onError,
}: OptimisticUpdateOptions<TData, TVariables>) {
  const queryClient = useQueryClient()

  return useCallback(
    async (variables: TVariables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey })

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<TData>(queryKey)

      // Optimistically update to the new value
      queryClient.setQueryData<TData>(queryKey, (old) => updateFn(old, variables))

      // Return context object with the snapshot value
      const context = { previousData }

      try {
        // Perform the actual mutation
        const result = await mutationFn(variables)
        
        // Call onSuccess callback
        onSuccess?.(result, variables)
        
        return result
      } catch (error) {
        // Roll back on error
        queryClient.setQueryData(queryKey, previousData)
        
        // Call onError callback
        onError?.(error, variables, context)
        
        throw error
      }
    },
    [queryClient, queryKey, mutationFn, updateFn, onSuccess, onError]
  )
}

/**
 * Simple optimistic toggle for boolean fields
 */
export function useOptimisticToggle<TData extends { id: string }>(
  queryKey: readonly unknown[],
  field: keyof TData,
  mutationFn: (id: string) => Promise<void>
) {
  return useOptimisticUpdate<TData[], string>({
    queryKey,
    mutationFn,
    updateFn: (oldData, id) =>
      oldData?.map((item) =>
        item.id === id ? { ...item, [field]: !item[field] } : item
      ) || [],
  })
}

/**
 * Optimistic list item addition
 */
export function useOptimisticAdd<TData>(
  queryKey: readonly unknown[],
  mutationFn: (item: Partial<TData>) => Promise<TData>
) {
  return useOptimisticUpdate<TData[], Partial<TData>>({
    queryKey,
    mutationFn,
    updateFn: (oldData, newItem) => [...(oldData || []), newItem as TData],
  })
}

/**
 * Optimistic list item removal
 */
export function useOptimisticRemove<TData extends { id: string }>(
  queryKey: readonly unknown[],
  mutationFn: (id: string) => Promise<void>
) {
  return useOptimisticUpdate<TData[], string>({
    queryKey,
    mutationFn,
    updateFn: (oldData, id) => oldData?.filter((item) => item.id !== id) || [],
  })
}

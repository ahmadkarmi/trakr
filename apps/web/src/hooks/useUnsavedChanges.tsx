import { useIsMutating } from '@tanstack/react-query'

/**
 * Hook to detect if there are unsaved changes (pending mutations)
 * Used to warn users before org switching or navigating away
 */
export const useUnsavedChanges = () => {
  // Check if any mutations are currently running
  const pendingMutations = useIsMutating()
  
  return pendingMutations > 0
}

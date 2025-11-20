import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

const FOCUS_QUERY_KEYS: (readonly [string])[] = [
  ['organizations'],
  ['branches'],
  ['zones'],
  ['auditor-assignments'],
  ['notifications'],
]

export function useFocusRefetch() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const handleFocus = () => {
      FOCUS_QUERY_KEYS.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key, exact: false })
      })
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleFocus()
      }
    })

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
    }
  }, [queryClient])
}

import { useMemo } from 'react'
import { useApiHealthStore } from '@/stores/apiHealth'

export function ApiHealthBanner() {
  const issues = useApiHealthStore((state) => state.issues)
  const clearAll = useApiHealthStore((state) => state.clearAll)
  const entries = useMemo(() => Object.entries(issues), [issues])

  if (entries.length === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-50 border-b border-amber-200 px-4 py-2 text-amber-900 text-sm shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="font-medium">Some data failed to load:</p>
          <ul className="list-disc ml-5 mt-1 space-y-0.5">
            {entries.map(([label, message]) => (
              <li key={label}>
                <span className="font-semibold">{label}:</span> {message}
              </li>
            ))}
          </ul>
        </div>
        <button
          onClick={clearAll}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500 text-white text-xs font-semibold shadow-sm hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-300"
          aria-label="Dismiss API health warnings"
        >
          <span>Dismiss</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

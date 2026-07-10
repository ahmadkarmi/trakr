import { useState, useEffect } from 'react'

// Simple offline banner for when user goes offline
export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setIsDismissed(false) // Reset dismissal when back online
    }
    const handleOffline = () => {
      setIsOnline(false)
      setIsDismissed(false) // Show again when going offline
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline || isDismissed) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-50 border-b border-yellow-200 px-4 py-2 shadow-md">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center flex-1 justify-center">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2 animate-pulse" />
            <p className="text-sm text-yellow-800">
              You're offline. Some features may be limited, but you can continue working.
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-900 text-xs font-semibold border border-yellow-300 hover:bg-yellow-200 hover:border-yellow-400 transition-colors"
          aria-label="Dismiss offline warning"
        >
          <span>Dismiss</span>
          <svg className="w-3 h-3 text-yellow-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

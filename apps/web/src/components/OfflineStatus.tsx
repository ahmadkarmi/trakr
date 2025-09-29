import { useState, useEffect } from 'react'

// Simple offline banner for when user goes offline
export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) return null

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
      <div className="flex items-center justify-center">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2 animate-pulse" />
          <p className="text-sm text-yellow-800">
            You're offline. Some features may be limited, but you can continue working.
          </p>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'

interface PWAState {
  isOnline: boolean
  isInstalled: boolean
  updateAvailable: boolean
  registration: ServiceWorkerRegistration | null
}

export function usePWA() {
  const [state, setState] = useState<PWAState>({
    isOnline: navigator.onLine,
    isInstalled: false,
    updateAvailable: false,
    registration: null,
  })

  useEffect(() => {
    // Check if PWA is installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isInWebAppiOS = (window.navigator as any).standalone === true
      
      setState(prev => ({
        ...prev,
        isInstalled: isStandalone || isInWebAppiOS
      }))
    }

    checkInstalled()

    // Register service worker
    const registerSW = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js')
          
          setState(prev => ({
            ...prev,
            registration
          }))

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setState(prev => ({
                    ...prev,
                    updateAvailable: true
                  }))
                }
              })
            }
          })

          console.log('Service Worker registered successfully')
        } catch (error) {
          console.error('Service Worker registration failed:', error)
        }
      }
    }

    registerSW()

    // Online/offline listeners
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }))
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }))

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const updateApp = () => {
    if (state.registration?.waiting) {
      state.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  }

  return {
    ...state,
    updateApp,
  }
}

import { useEffect, useState } from 'react'
import { APP_VERSION } from '../utils/appInfo'
import { logger } from '../utils/logger'

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

    // Register service worker (disabled in development to prevent caching issues)
    const registerSW = async () => {
      // Skip service worker registration in development
      if (import.meta.env.DEV) {
        logger.info('Service Worker skipped in development mode', { context: 'PWA' })
        return
      }

      if ('serviceWorker' in navigator) {
        try {
          const versionedSWUrl = `/sw.js?v=${encodeURIComponent(APP_VERSION)}`
          const registration = await navigator.serviceWorker.register(versionedSWUrl)
          
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

          logger.info('Service Worker registered successfully', { context: 'PWA' })
        } catch (error) {
          logger.error('Service Worker registration failed', error, { context: 'PWA' })
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

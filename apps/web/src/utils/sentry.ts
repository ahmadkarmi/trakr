/**
 * Sentry Error Tracking Configuration
 * 
 * Initializes Sentry for production error tracking and performance monitoring
 */

import * as Sentry from '@sentry/react'

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN
const ENVIRONMENT = import.meta.env.MODE
const RELEASE = import.meta.env.VITE_APP_VERSION || 'unknown'

/**
 * Initialize Sentry error tracking
 * Only runs in production or when SENTRY_DSN is provided
 */
export function initSentry() {
  // Skip initialization if no DSN provided or in development
  if (!SENTRY_DSN) {
    console.info('ℹ️ Sentry not configured (no VITE_SENTRY_DSN)')
    return
  }

  if (import.meta.env.DEV) {
    console.info('ℹ️ Sentry disabled in development')
    return
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    release: RELEASE,

    // Send default PII data (IP address, user agent) for better debugging
    // Note: User context (email, ID) is already sent separately
    sendDefaultPii: true,

    // Performance Monitoring
    integrations: [
      // React Router integration
      Sentry.browserTracingIntegration(),
      
      // Replay integration for session recordings
      Sentry.replayIntegration({
        maskAllText: true, // Privacy: mask all text
        blockAllMedia: true, // Privacy: block images/video
      }),
    ],

    // Performance Monitoring sample rate
    // 1.0 = 100% of transactions for performance monitoring
    // Reduce in high-traffic apps to save quota
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    // Session Replay sample rate
    // Captures 10% of all sessions
    replaysSessionSampleRate: 0.1,
    
    // Capture 100% of sessions with errors
    replaysOnErrorSampleRate: 1.0,

    // Filter out sensitive data before sending
    beforeSend(event) {
      // Don't send errors from browser extensions
      if (event.exception?.values?.[0]?.stacktrace?.frames?.some(
        frame => frame.filename?.includes('chrome-extension://')
      )) {
        return null
      }

      // Scrub sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
          if (breadcrumb.data?.password) {
            breadcrumb.data.password = '[Filtered]'
          }
          if (breadcrumb.data?.token) {
            breadcrumb.data.token = '[Filtered]'
          }
          return breadcrumb
        })
      }

      return event
    },

    // Ignore common non-critical errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'chrome-extension',
      'moz-extension',
      
      // Network errors (handled by app)
      'Network request failed',
      'NetworkError',
      'Failed to fetch',
      
      // ResizeObserver errors (harmless)
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      
      // User cancelled actions
      'AbortError',
      'The user aborted a request',
      
      // Common non-critical errors
      'Non-Error promise rejection captured',
    ],

    // Attach user context when available
    initialScope: {
      tags: {
        app: 'trakr-web',
      },
    },
  })

  console.info('✅ Sentry initialized', { environment: ENVIRONMENT, release: RELEASE })
}

/**
 * Set user context for Sentry
 * Call this after successful authentication
 */
export function setSentryUser(user: {
  id: string
  email?: string
  role?: string
  orgId?: string
}) {
  if (!SENTRY_DSN) return

  Sentry.setUser({
    id: user.id,
    email: user.email,
    // Add custom context
    role: user.role,
    orgId: user.orgId,
  })
}

/**
 * Clear user context (call on logout)
 */
export function clearSentryUser() {
  if (!SENTRY_DSN) return
  Sentry.setUser(null)
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, data?: Record<string, any>) {
  if (!SENTRY_DSN) return

  Sentry.addBreadcrumb({
    message,
    level: 'info',
    data,
    timestamp: Date.now() / 1000,
  })
}

/**
 * Manually capture an exception
 */
export function captureException(error: Error | unknown, context?: Record<string, any>) {
  if (!SENTRY_DSN) {
    // Fallback to console in development
    console.error('Error captured:', error, context)
    return
  }

  Sentry.captureException(error, {
    extra: context,
  })
}

/**
 * Manually capture a message
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (!SENTRY_DSN) {
    console[level === 'error' ? 'error' : 'log'](message)
    return
  }

  Sentry.captureMessage(message, level)
}

/**
 * Set custom context for errors
 */
export function setContext(name: string, context: Record<string, any>) {
  if (!SENTRY_DSN) return
  Sentry.setContext(name, context)
}

// Export Sentry instance for advanced usage
export { Sentry }

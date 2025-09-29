export interface AppError {
  code: string
  message: string
  userMessage: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  recoverable: boolean
  timestamp: Date
  context?: Record<string, any>
}

export type ErrorCode = 
  // Authentication Errors
  | 'auth/invalid-credentials'
  | 'auth/user-not-found'
  | 'auth/email-not-verified'
  | 'auth/password-reset-failed'
  | 'auth/session-expired'
  | 'auth/insufficient-permissions'
  
  // Network Errors
  | 'network/connection-failed'
  | 'network/timeout'
  | 'network/server-error'
  | 'network/rate-limited'
  
  // Data Errors
  | 'data/not-found'
  | 'data/validation-failed'
  | 'data/save-failed'
  | 'data/sync-failed'
  
  // File/Upload Errors
  | 'upload/file-too-large'
  | 'upload/invalid-format'
  | 'upload/upload-failed'
  | 'upload/storage-full'
  
  // Application Errors
  | 'app/feature-unavailable'
  | 'app/maintenance-mode'
  | 'app/browser-unsupported'
  | 'app/unknown-error'

const ERROR_MESSAGES: Record<ErrorCode, { message: string; severity: AppError['severity']; recoverable: boolean }> = {
  // Authentication
  'auth/invalid-credentials': {
    message: 'Invalid email or password. Please check your credentials and try again.',
    severity: 'medium',
    recoverable: true
  },
  'auth/user-not-found': {
    message: 'No account found with this email. Please check your email or contact your administrator.',
    severity: 'medium',
    recoverable: true
  },
  'auth/email-not-verified': {
    message: 'Please verify your email address before signing in.',
    severity: 'medium',
    recoverable: true
  },
  'auth/password-reset-failed': {
    message: 'Failed to send password reset email. Please try again or contact support.',
    severity: 'medium',
    recoverable: true
  },
  'auth/session-expired': {
    message: 'Your session has expired. Please sign in again.',
    severity: 'medium',
    recoverable: true
  },
  'auth/insufficient-permissions': {
    message: 'You don\'t have permission to access this feature. Contact your administrator.',
    severity: 'high',
    recoverable: false
  },

  // Network
  'network/connection-failed': {
    message: 'Connection failed. Please check your internet connection and try again.',
    severity: 'high',
    recoverable: true
  },
  'network/timeout': {
    message: 'Request timed out. Please try again.',
    severity: 'medium',
    recoverable: true
  },
  'network/server-error': {
    message: 'Server error occurred. Please try again in a moment.',
    severity: 'high',
    recoverable: true
  },
  'network/rate-limited': {
    message: 'Too many requests. Please wait a moment before trying again.',
    severity: 'medium',
    recoverable: true
  },

  // Data
  'data/not-found': {
    message: 'The requested information could not be found.',
    severity: 'medium',
    recoverable: false
  },
  'data/validation-failed': {
    message: 'Please check your input and try again.',
    severity: 'low',
    recoverable: true
  },
  'data/save-failed': {
    message: 'Failed to save changes. Please try again.',
    severity: 'high',
    recoverable: true
  },
  'data/sync-failed': {
    message: 'Failed to sync data. Your changes may not be saved.',
    severity: 'high',
    recoverable: true
  },

  // Upload
  'upload/file-too-large': {
    message: 'File is too large. Please choose a smaller file (max 10MB).',
    severity: 'medium',
    recoverable: true
  },
  'upload/invalid-format': {
    message: 'Invalid file format. Please use JPG, PNG, or PDF files.',
    severity: 'medium',
    recoverable: true
  },
  'upload/upload-failed': {
    message: 'Failed to upload file. Please try again.',
    severity: 'medium',
    recoverable: true
  },
  'upload/storage-full': {
    message: 'Storage limit reached. Please contact your administrator.',
    severity: 'high',
    recoverable: false
  },

  // Application
  'app/feature-unavailable': {
    message: 'This feature is temporarily unavailable. Please try again later.',
    severity: 'medium',
    recoverable: true
  },
  'app/maintenance-mode': {
    message: 'System is under maintenance. Please try again later.',
    severity: 'high',
    recoverable: true
  },
  'app/browser-unsupported': {
    message: 'Your browser is not supported. Please update to a modern browser.',
    severity: 'high',
    recoverable: false
  },
  'app/unknown-error': {
    message: 'An unexpected error occurred. Please try again or contact support.',
    severity: 'high',
    recoverable: true
  }
}

export class ErrorHandler {
  static createError(
    code: ErrorCode,
    originalError?: Error,
    context?: Record<string, any>
  ): AppError {
    const errorConfig = ERROR_MESSAGES[code]
    
    return {
      code,
      message: originalError?.message || `Error: ${code}`,
      userMessage: errorConfig.message,
      severity: errorConfig.severity,
      recoverable: errorConfig.recoverable,
      timestamp: new Date(),
      context: {
        ...context,
        originalStack: originalError?.stack,
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    }
  }

  static fromSupabaseError(error: any, context?: Record<string, any>): AppError {
    // Map common Supabase errors to our error codes
    const message = error?.message?.toLowerCase() || ''
    
    if (message.includes('invalid login credentials') || message.includes('invalid_credentials')) {
      return this.createError('auth/invalid-credentials', error, context)
    }
    
    if (message.includes('user not found')) {
      return this.createError('auth/user-not-found', error, context)
    }
    
    if (message.includes('email not confirmed')) {
      return this.createError('auth/email-not-verified', error, context)
    }
    
    if (message.includes('jwt expired') || message.includes('session expired')) {
      return this.createError('auth/session-expired', error, context)
    }
    
    if (message.includes('insufficient_privilege') || message.includes('permission')) {
      return this.createError('auth/insufficient-permissions', error, context)
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return this.createError('network/connection-failed', error, context)
    }
    
    // Default to unknown error
    return this.createError('app/unknown-error', error, context)
  }

  static fromNetworkError(error: any, context?: Record<string, any>): AppError {
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      return this.createError('network/timeout', error, context)
    }
    
    if (error.status >= 500) {
      return this.createError('network/server-error', error, context)
    }
    
    if (error.status === 429) {
      return this.createError('network/rate-limited', error, context)
    }
    
    return this.createError('network/connection-failed', error, context)
  }

  static logError(error: AppError): void {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 ${error.severity.toUpperCase()} Error: ${error.code}`)
      console.error('User Message:', error.userMessage)
      console.error('Technical Message:', error.message)
      console.error('Context:', error.context)
      console.error('Timestamp:', error.timestamp)
      console.groupEnd()
    }
    
    // In production, you could send to error tracking service
    // Example: Sentry.captureException(error)
    
    // Store in local storage for debugging (limit to last 50 errors)
    try {
      const stored = JSON.parse(localStorage.getItem('trakr_errors') || '[]')
      stored.unshift(error)
      localStorage.setItem('trakr_errors', JSON.stringify(stored.slice(0, 50)))
    } catch {
      // Ignore localStorage errors
    }
  }

  static getStoredErrors(): AppError[] {
    try {
      return JSON.parse(localStorage.getItem('trakr_errors') || '[]')
    } catch {
      return []
    }
  }

  static clearStoredErrors(): void {
    localStorage.removeItem('trakr_errors')
  }
}

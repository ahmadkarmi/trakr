import { useEffect, useState } from 'react'
import { AppError } from '../utils/errorHandler'

interface ErrorToastProps {
  error: AppError | null
  onClose: () => void
  autoClose?: boolean
  autoCloseDelay?: number
}

export function ErrorToast({ error, onClose, autoClose = true, autoCloseDelay = 5000 }: ErrorToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (error) {
      setIsVisible(true)
      setIsExiting(false)
      
      if (autoClose) {
        const timer = setTimeout(() => {
          handleClose()
        }, autoCloseDelay)
        
        return () => clearTimeout(timer)
      }
    } else {
      setIsVisible(false)
    }
  }, [error, autoClose, autoCloseDelay])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      setIsVisible(false)
      onClose()
    }, 300) // Match animation duration
  }

  if (!error || !isVisible) {
    return null
  }

  const getSeverityStyles = (severity: AppError['severity']) => {
    switch (severity) {
      case 'low':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-400',
          text: 'text-blue-800'
        }
      case 'medium':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: 'text-yellow-400',
          text: 'text-yellow-800'
        }
      case 'high':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-400',
          text: 'text-red-800'
        }
      case 'critical':
        return {
          bg: 'bg-red-100',
          border: 'border-red-300',
          icon: 'text-red-500',
          text: 'text-red-900'
        }
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          icon: 'text-gray-400',
          text: 'text-gray-800'
        }
    }
  }

  const getSeverityIcon = (severity: AppError['severity']) => {
    switch (severity) {
      case 'low':
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )
      case 'medium':
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      case 'high':
      case 'critical':
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      default:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  const styles = getSeverityStyles(error.severity)

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
      <div
        className={`
          ${styles.bg} ${styles.border} ${styles.text}
          border rounded-lg shadow-lg p-4 transition-all duration-300 ease-in-out
          ${isExiting ? 'transform translate-x-full opacity-0' : 'transform translate-x-0 opacity-100'}
        `}
      >
        <div className="flex items-start">
          <div className={`flex-shrink-0 ${styles.icon}`}>
            {getSeverityIcon(error.severity)}
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium">
              {error.userMessage}
            </p>
            {process.env.NODE_ENV === 'development' && (
              <p className="mt-1 text-xs opacity-75">
                Code: {error.code}
              </p>
            )}
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={handleClose}
              className={`
                ${styles.text} hover:opacity-75 transition-opacity
                inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent
              `}
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
        
        {error.recoverable && (
          <div className="mt-3">
            <button
              onClick={() => {
                // Emit custom event for retry action
                window.dispatchEvent(new CustomEvent('error-retry', { detail: error }))
                handleClose()
              }}
              className={`
                text-sm font-medium underline hover:no-underline transition-all
                ${styles.text} opacity-75 hover:opacity-100
              `}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Toast container for managing multiple toasts
export function ErrorToastContainer() {
  const [toasts, setToasts] = useState<AppError[]>([])

  useEffect(() => {
    const handleError = (event: CustomEvent<AppError>) => {
      setToasts(prev => [...prev, event.detail])
    }

    const handleClearErrors = () => {
      setToasts([])
    }

    window.addEventListener('app-error' as any, handleError)
    window.addEventListener('clear-errors' as any, handleClearErrors)

    return () => {
      window.removeEventListener('app-error' as any, handleError)
      window.removeEventListener('clear-errors' as any, handleClearErrors)
    }
  }, [])

  const removeToast = (index: number) => {
    setToasts(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((error, index) => (
        <ErrorToast
          key={`${error.code}-${error.timestamp.getTime()}-${index}`}
          error={error}
          onClose={() => removeToast(index)}
        />
      ))}
    </div>
  )
}

// Utility function to show error toast
export function showErrorToast(error: AppError) {
  window.dispatchEvent(new CustomEvent('app-error', { detail: error }))
}

// Utility function to clear all error toasts
export function clearErrorToasts() {
  window.dispatchEvent(new CustomEvent('clear-errors'))
}

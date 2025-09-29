import { useCallback, useState } from 'react'
import { ErrorHandler, AppError, ErrorCode } from '../utils/errorHandler'

interface UseErrorHandlerReturn {
  error: AppError | null
  isError: boolean
  handleError: (error: any, context?: Record<string, any>) => AppError
  handleSupabaseError: (error: any, context?: Record<string, any>) => AppError
  handleNetworkError: (error: any, context?: Record<string, any>) => AppError
  createError: (code: ErrorCode, originalError?: Error, context?: Record<string, any>) => AppError
  clearError: () => void
  retryAction: (action: () => Promise<void> | void) => Promise<void>
}

export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setError] = useState<AppError | null>(null)

  const handleError = useCallback((error: any, context?: Record<string, any>): AppError => {
    let appError: AppError

    // Determine error type and create appropriate AppError
    if (error?.message?.includes('supabase') || error?.code?.startsWith('PGRST')) {
      appError = ErrorHandler.fromSupabaseError(error, context)
    } else if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
      appError = ErrorHandler.fromNetworkError(error, context)
    } else if (error instanceof Error) {
      appError = ErrorHandler.createError('app/unknown-error', error, context)
    } else if (typeof error === 'string') {
      appError = ErrorHandler.createError('app/unknown-error', new Error(error), context)
    } else {
      appError = ErrorHandler.createError('app/unknown-error', new Error('Unknown error occurred'), context)
    }

    // Log the error
    ErrorHandler.logError(appError)
    
    // Set error state
    setError(appError)
    
    return appError
  }, [])

  const handleSupabaseError = useCallback((error: any, context?: Record<string, any>): AppError => {
    const appError = ErrorHandler.fromSupabaseError(error, context)
    ErrorHandler.logError(appError)
    setError(appError)
    return appError
  }, [])

  const handleNetworkError = useCallback((error: any, context?: Record<string, any>): AppError => {
    const appError = ErrorHandler.fromNetworkError(error, context)
    ErrorHandler.logError(appError)
    setError(appError)
    return appError
  }, [])

  const createError = useCallback((code: ErrorCode, originalError?: Error, context?: Record<string, any>): AppError => {
    const appError = ErrorHandler.createError(code, originalError, context)
    ErrorHandler.logError(appError)
    setError(appError)
    return appError
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const retryAction = useCallback(async (action: () => Promise<void> | void): Promise<void> => {
    try {
      clearError()
      await action()
    } catch (err) {
      handleError(err, { retryAttempt: true })
      throw err // Re-throw so caller can handle if needed
    }
  }, [handleError, clearError])

  return {
    error,
    isError: error !== null,
    handleError,
    handleSupabaseError,
    handleNetworkError,
    createError,
    clearError,
    retryAction
  }
}

// Specialized hooks for common use cases
export function useAsyncErrorHandler() {
  const { handleError, clearError, error, isError } = useErrorHandler()
  const [isLoading, setIsLoading] = useState(false)

  const executeAsync = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T | null> => {
    try {
      setIsLoading(true)
      clearError()
      const result = await asyncFn()
      return result
    } catch (err) {
      handleError(err, context)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [handleError, clearError])

  return {
    executeAsync,
    isLoading,
    error,
    isError,
    clearError
  }
}

// Hook for form error handling
export function useFormErrorHandler() {
  const { handleError, clearError, error, isError } = useErrorHandler()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleFormError = useCallback((error: any, field?: string) => {
    if (field && typeof error === 'string') {
      setFieldErrors(prev => ({ ...prev, [field]: error }))
    } else {
      handleError(error, { formError: true, field })
    }
  }, [handleError])

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }, [])

  const clearAllErrors = useCallback(() => {
    clearError()
    setFieldErrors({})
  }, [clearError])

  return {
    error,
    isError,
    fieldErrors,
    hasFieldErrors: Object.keys(fieldErrors).length > 0,
    handleFormError,
    clearFieldError,
    clearAllErrors,
    getFieldError: (field: string) => fieldErrors[field]
  }
}

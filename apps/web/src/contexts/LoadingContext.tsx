import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface LoadingState {
  [key: string]: boolean
}

interface LoadingContextType {
  loadingStates: LoadingState
  isLoading: (key?: string) => boolean
  setLoading: (key: string, loading: boolean) => void
  startLoading: (key: string) => void
  stopLoading: (key: string) => void
  clearAllLoading: () => void
  isAnyLoading: boolean
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

interface LoadingProviderProps {
  children: ReactNode
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [loadingStates, setLoadingStates] = useState<LoadingState>({})

  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: loading
    }))
  }, [])

  const startLoading = useCallback((key: string) => {
    setLoading(key, true)
  }, [setLoading])

  const stopLoading = useCallback((key: string) => {
    setLoading(key, false)
  }, [setLoading])

  const isLoading = useCallback((key?: string) => {
    if (!key) return Object.values(loadingStates).some(Boolean)
    return loadingStates[key] || false
  }, [loadingStates])

  const clearAllLoading = useCallback(() => {
    setLoadingStates({})
  }, [])

  const isAnyLoading = Object.values(loadingStates).some(Boolean)

  const value: LoadingContextType = {
    loadingStates,
    isLoading,
    setLoading,
    startLoading,
    stopLoading,
    clearAllLoading,
    isAnyLoading
  }

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  )
}

export function useLoading() {
  const context = useContext(LoadingContext)
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider')
  }
  return context
}

// Specialized hook for async operations
export function useAsyncLoading() {
  const { setLoading, isLoading } = useLoading()

  const executeWithLoading = useCallback(async function<T>(
    key: string,
    asyncFn: () => Promise<T>
  ): Promise<T> {
    try {
      setLoading(key, true)
      const result = await asyncFn()
      return result
    } finally {
      setLoading(key, false)
    }
  }, [setLoading])

  return {
    executeWithLoading,
    isLoading
  }
}

// Hook for component-specific loading
export function useComponentLoading(componentName: string) {
  const { setLoading, isLoading } = useLoading()

  const startComponentLoading = useCallback((action?: string) => {
    const key = action ? `${componentName}.${action}` : componentName
    setLoading(key, true)
  }, [componentName, setLoading])

  const stopComponentLoading = useCallback((action?: string) => {
    const key = action ? `${componentName}.${action}` : componentName
    setLoading(key, false)
  }, [componentName, setLoading])

  const isComponentLoading = useCallback((action?: string) => {
    const key = action ? `${componentName}.${action}` : componentName
    return isLoading(key)
  }, [componentName, isLoading])

  return {
    startLoading: startComponentLoading,
    stopLoading: stopComponentLoading,
    isLoading: isComponentLoading
  }
}

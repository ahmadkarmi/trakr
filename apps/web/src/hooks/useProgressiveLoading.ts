import { useState, useEffect, useCallback } from 'react'

interface ProgressiveLoadingState<T> {
  data: T | null
  isLoading: boolean
  error: Error | null
  progress: number
  stage: string
}

interface ProgressiveLoadingOptions {
  stages?: string[]
  stageDelays?: number[]
  enableProgress?: boolean
}

export function useProgressiveLoading<T>(
  asyncFn: () => Promise<T>,
  options: ProgressiveLoadingOptions = {}
) {
  const {
    stages = ['Initializing...', 'Loading data...', 'Finalizing...'],
    stageDelays = [500, 1000, 300],
    enableProgress = true
  } = options

  const [state, setState] = useState<ProgressiveLoadingState<T>>({
    data: null,
    isLoading: false,
    error: null,
    progress: 0,
    stage: stages[0] || 'Loading...'
  })

  const load = useCallback(async () => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      progress: 0,
      stage: stages[0] || 'Loading...'
    }))

    try {
      let currentProgress = 0
      const progressIncrement = 100 / stages.length

      // Simulate progressive loading stages
      for (let i = 0; i < stages.length - 1; i++) {
        setState(prev => ({
          ...prev,
          stage: stages[i],
          progress: enableProgress ? currentProgress : 0
        }))

        await new Promise(resolve => setTimeout(resolve, stageDelays[i] || 300))
        currentProgress += progressIncrement
      }

      // Final stage - actual data loading
      setState(prev => ({
        ...prev,
        stage: stages[stages.length - 1] || 'Finalizing...',
        progress: enableProgress ? currentProgress : 0
      }))

      const data = await asyncFn()

      setState(prev => ({
        ...prev,
        data,
        isLoading: false,
        progress: 100,
        stage: 'Complete'
      }))

      return data
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as Error,
        isLoading: false,
        stage: 'Error'
      }))
      throw error
    }
  }, [asyncFn, stages, stageDelays, enableProgress])

  const reset = useCallback(() => {
    setState({
      data: null,
      isLoading: false,
      error: null,
      progress: 0,
      stage: stages[0] || 'Loading...'
    })
  }, [stages])

  return {
    ...state,
    load,
    reset,
    reload: load
  }
}

// Hook for chunked data loading (e.g., paginated data)
export function useChunkedLoading<T>(
  chunkLoader: (chunk: number) => Promise<T[]>,
  options: { chunkSize?: number; maxChunks?: number } = {}
) {
  const { chunkSize = 10, maxChunks = 10 } = options
  const [data, setData] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [currentChunk, setCurrentChunk] = useState(0)
  const [error, setError] = useState<Error | null>(null)

  const loadChunk = useCallback(async (chunkIndex: number) => {
    if (isLoading || chunkIndex >= maxChunks) return

    setIsLoading(true)
    setError(null)

    try {
      const chunkData = await chunkLoader(chunkIndex)
      
      if (chunkData.length === 0 || chunkData.length < chunkSize) {
        setHasMore(false)
      }

      setData(prev => [...prev, ...chunkData])
      setCurrentChunk(chunkIndex + 1)
    } catch (err) {
      setError(err as Error)
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }, [chunkLoader, chunkSize, maxChunks, isLoading])

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      loadChunk(currentChunk)
    }
  }, [hasMore, isLoading, currentChunk, loadChunk])

  const reset = useCallback(() => {
    setData([])
    setCurrentChunk(0)
    setHasMore(true)
    setError(null)
    setIsLoading(false)
  }, [])

  const reload = useCallback(() => {
    reset()
    loadChunk(0)
  }, [reset, loadChunk])

  // Load initial chunk
  useEffect(() => {
    if (data.length === 0 && !isLoading && hasMore) {
      loadChunk(0)
    }
  }, [data.length, isLoading, hasMore, loadChunk])

  return {
    data,
    isLoading,
    hasMore,
    error,
    loadMore,
    reset,
    reload,
    currentChunk,
    totalLoaded: data.length
  }
}

// Hook for optimistic updates
export function useOptimisticLoading<T>() {
  const [optimisticData, setOptimisticData] = useState<T | null>(null)
  const [actualData, setActualData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const executeOptimistic = useCallback(async (
    optimisticValue: T,
    asyncFn: () => Promise<T>
  ) => {
    // Immediately show optimistic value
    setOptimisticData(optimisticValue)
    setIsLoading(true)
    setError(null)

    try {
      const result = await asyncFn()
      setActualData(result)
      setOptimisticData(null) // Clear optimistic data
      return result
    } catch (err) {
      setError(err as Error)
      setOptimisticData(null) // Revert optimistic update
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setOptimisticData(null)
    setActualData(null)
    setIsLoading(false)
    setError(null)
  }, [])

  return {
    data: optimisticData || actualData,
    isOptimistic: optimisticData !== null,
    isLoading,
    error,
    executeOptimistic,
    reset
  }
}

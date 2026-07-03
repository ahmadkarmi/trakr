import { useEffect, useCallback, useState } from 'react'
import { logger } from '../utils/logger'

interface PerformanceMetrics {
  // Core Web Vitals
  fcp: number | null // First Contentful Paint
  lcp: number | null // Largest Contentful Paint
  fid: number | null // First Input Delay
  cls: number | null // Cumulative Layout Shift
  ttfb: number | null // Time to First Byte
  
  // Custom metrics
  loadTime: number | null
  domContentLoaded: number | null
  memoryUsage: number | null
  connectionType: string | null
}

interface PerformanceEntry extends Performance {
  memory?: {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  }
}

export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
    loadTime: null,
    domContentLoaded: null,
    memoryUsage: null,
    connectionType: null
  })

  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    // Check for Performance Observer support
    const supported = 'PerformanceObserver' in window && 'performance' in window
    setIsSupported(supported)

    if (!supported) return

    // Get basic navigation timing
    const getNavigationTiming = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navigation) {
        setMetrics(prev => ({
          ...prev,
          loadTime: navigation.loadEventEnd - navigation.loadEventStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          ttfb: navigation.responseStart - navigation.requestStart
        }))
      }
    }

    // Get memory usage
    const getMemoryUsage = () => {
      const perf = performance as PerformanceEntry
      if (perf.memory) {
        setMetrics(prev => ({
          ...prev,
          memoryUsage: perf.memory!.usedJSHeapSize
        }))
      }
    }

    // Get connection info
    const getConnectionInfo = () => {
      const nav = navigator as any
      if (nav.connection) {
        setMetrics(prev => ({
          ...prev,
          connectionType: nav.connection.effectiveType || nav.connection.type || 'unknown'
        }))
      }
    }

    // Observe paint metrics (FCP)
    const paintObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          setMetrics(prev => ({ ...prev, fcp: entry.startTime }))
        }
      }
    })

    // Observe LCP
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
      setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }))
    })

    // Observe FID
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fidEntry = entry as any
        setMetrics(prev => ({ ...prev, fid: fidEntry.processingStart - fidEntry.startTime }))
      }
    })

    // Observe CLS
    let clsValue = 0
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as any
        if (!layoutShift.hadRecentInput) {
          clsValue += layoutShift.value
          setMetrics(prev => ({ ...prev, cls: clsValue }))
        }
      }
    })

    try {
      paintObserver.observe({ entryTypes: ['paint'] })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      fidObserver.observe({ entryTypes: ['first-input'] })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
    } catch (error) {
      logger.warn('Some performance observers not supported', { context: 'PerformanceMonitoring', data: error })
    }

    // Get initial metrics
    setTimeout(() => {
      getNavigationTiming()
      getMemoryUsage()
      getConnectionInfo()
    }, 1000)

    // Update memory usage periodically
    const memoryInterval = setInterval(getMemoryUsage, 30000)

    return () => {
      paintObserver.disconnect()
      lcpObserver.disconnect()
      fidObserver.disconnect()
      clsObserver.disconnect()
      clearInterval(memoryInterval)
    }
  }, [])

  const getPerformanceScore = useCallback(() => {
    if (!metrics.fcp || !metrics.lcp || !metrics.cls) return null

    // Simple scoring based on Core Web Vitals thresholds
    let score = 0
    let maxScore = 0

    // FCP scoring (good: <1.8s, needs improvement: 1.8-3s, poor: >3s)
    if (metrics.fcp) {
      maxScore += 25
      if (metrics.fcp < 1800) score += 25
      else if (metrics.fcp < 3000) score += 15
      else score += 5
    }

    // LCP scoring (good: <2.5s, needs improvement: 2.5-4s, poor: >4s)
    if (metrics.lcp) {
      maxScore += 25
      if (metrics.lcp < 2500) score += 25
      else if (metrics.lcp < 4000) score += 15
      else score += 5
    }

    // FID scoring (good: <100ms, needs improvement: 100-300ms, poor: >300ms)
    if (metrics.fid !== null) {
      maxScore += 25
      if (metrics.fid < 100) score += 25
      else if (metrics.fid < 300) score += 15
      else score += 5
    }

    // CLS scoring (good: <0.1, needs improvement: 0.1-0.25, poor: >0.25)
    if (metrics.cls !== null) {
      maxScore += 25
      if (metrics.cls < 0.1) score += 25
      else if (metrics.cls < 0.25) score += 15
      else score += 5
    }

    return maxScore > 0 ? Math.round((score / maxScore) * 100) : null
  }, [metrics])

  const logMetrics = useCallback(() => {
    // Only log if we have meaningful metrics (at least one metric is available)
    const hasMetrics = metrics.fcp || metrics.lcp || metrics.fid !== null || metrics.cls !== null || metrics.ttfb || metrics.loadTime
    
    if (hasMetrics) {
      logger.group('Performance Metrics', () => {
        if (metrics.fcp) logger.perf('First Contentful Paint', metrics.fcp)
        if (metrics.lcp) logger.perf('Largest Contentful Paint', metrics.lcp)
        if (metrics.fid !== null) logger.perf('First Input Delay', metrics.fid)
        if (metrics.cls !== null) logger.debug(`Cumulative Layout Shift: ${metrics.cls.toFixed(4)}`, { context: 'PerformanceMonitoring' })
        if (metrics.ttfb) logger.perf('Time to First Byte', metrics.ttfb)
        if (metrics.loadTime) logger.perf('Load Time', metrics.loadTime)
        if (metrics.memoryUsage) {
          logger.debug(`Memory Usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`, { context: 'PerformanceMonitoring' })
        }
        if (metrics.connectionType) {
          logger.debug(`Connection Type: ${metrics.connectionType}`, { context: 'PerformanceMonitoring' })
        }
        const score = getPerformanceScore()
        if (score) logger.debug(`Performance Score: ${score}`, { context: 'PerformanceMonitoring' })
      })
    }
  }, [metrics, getPerformanceScore])

  const sendMetricsToAnalytics = useCallback(async (_customData?: Record<string, any>) => {
    // Only send if we have meaningful metrics
    const hasMetrics = metrics.fcp || metrics.lcp || metrics.fid !== null || metrics.cls !== null
    if (!hasMetrics) return

    // Disabled in development to reduce console noise
    // if (process.env.NODE_ENV === 'development') {
    //   console.log('📊 Would send metrics to analytics:', payload)
    // }

    // Example: Send to your analytics endpoint
    // try {
    //   await fetch('/api/analytics/performance', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(payload)
    //   })
    // } catch (error) {
    //   console.error('Failed to send performance metrics:', error)
    // }
  }, [metrics])

  const measureCustomMetric = useCallback((name: string, startTime?: number) => {
    const endTime = performance.now()
    const duration = startTime ? endTime - startTime : endTime

    logger.perf(name, duration)

    // You could store custom metrics in state or send to analytics
    return duration
  }, [])

  const startMeasurement = useCallback((name: string) => {
    const startTime = performance.now()
    return {
      end: () => measureCustomMetric(name, startTime),
      startTime
    }
  }, [measureCustomMetric])

  return {
    metrics,
    isSupported,
    performanceScore: getPerformanceScore(),
    logMetrics,
    sendMetricsToAnalytics,
    measureCustomMetric,
    startMeasurement
  }
}

// Hook for measuring component render performance
export function useRenderPerformance(componentName: string) {
  const { measureCustomMetric } = usePerformanceMonitoring()
  const [renderCount, setRenderCount] = useState(0)
  const [renderTimes, setRenderTimes] = useState<number[]>([])

  useEffect(() => {
    const startTime = performance.now()
    
    return () => {
      const renderTime = measureCustomMetric(`${componentName} render`, startTime)
      setRenderCount(prev => prev + 1)
      setRenderTimes(prev => [...prev.slice(-9), renderTime]) // Keep last 10 renders
    }
  })

  const averageRenderTime = renderTimes.length > 0 
    ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length 
    : 0

  return {
    renderCount,
    averageRenderTime,
    lastRenderTime: renderTimes[renderTimes.length - 1] || 0
  }
}

// Hook for measuring API call performance
export function useApiPerformance() {
  const { measureCustomMetric } = usePerformanceMonitoring()

  const measureApiCall = useCallback(async <T>(
    name: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now()
    
    try {
      const result = await apiCall()
      measureCustomMetric(`API: ${name} (success)`, startTime)
      return result
    } catch (error) {
      measureCustomMetric(`API: ${name} (error)`, startTime)
      throw error
    }
  }, [measureCustomMetric])

  return { measureApiCall }
}

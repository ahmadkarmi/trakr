import { logger } from './logger'

export class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  private failureCount = 0
  private lastFailure = 0

  constructor(private readonly options: { failureThreshold: number; cooldownMs: number }) {}

  canRequest() {
    if (this.state === 'open') {
      const now = Date.now()
      if (now - this.lastFailure > this.options.cooldownMs) {
        this.state = 'half-open'
        return true
      }
      return false
    }
    return true
  }

  recordSuccess() {
    this.failureCount = 0
    this.state = 'closed'
  }

  recordFailure() {
    this.failureCount += 1
    this.lastFailure = Date.now()
    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'open'
      logger.warn('Circuit breaker opened (too many Supabase failures)', { context: 'CircuitBreaker' })
    }
  }
}

const defaultBreaker = new CircuitBreaker({ failureThreshold: 5, cooldownMs: 30_000 })

function shouldRetry(status: number) {
  return status >= 500 || status === 408 || status === 429
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function guardedFetch(input: RequestInfo, init?: RequestInit, opts?: { timeoutMs?: number; maxRetries?: number; breaker?: CircuitBreaker }) {
  const breaker = opts?.breaker ?? defaultBreaker
  const timeoutMs = opts?.timeoutMs ?? 10_000
  const maxRetries = opts?.maxRetries ?? 2

  if (!breaker.canRequest()) {
    const error = new Error('Supabase temporarily unavailable (circuit breaker open)')
    logger.error(error.message, error, { context: 'CircuitBreaker' })
    throw error
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController()
    const signal = init?.signal
    if (signal) {
      signal.addEventListener('abort', () => controller.abort(), { once: true })
    }
    const mergedInit: RequestInit = { ...init, signal: controller.signal }
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(input, mergedInit)
      clearTimeout(timer)
      if (!response.ok && shouldRetry(response.status) && attempt < maxRetries) {
        breaker.recordFailure()
        await sleep(300 * (attempt + 1))
        continue
      }
      breaker.recordSuccess()
      return response
    } catch (err: any) {
      clearTimeout(timer)
      const abortError = err?.name === 'AbortError'
      breaker.recordFailure()
      if (abortError && attempt < maxRetries) {
        await sleep(300 * (attempt + 1))
        continue
      }
      logger.error('Supabase fetch failed', err, { context: 'CircuitBreaker', data: { attempt } })
      throw err
    }
  }

  throw new Error('guardedFetch exhausted retries')
}

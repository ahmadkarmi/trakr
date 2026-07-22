import { describe, it, expect } from 'vitest'
import { backoffMs, isPermanentError, filterRenderablePending, type OutboxRecord } from '../photoOutbox'

// Unit coverage for the offline photo outbox's pure decision logic. The IndexedDB
// round-trip + single-flight flush + exactly-once replay are proven end-to-end in
// apps/web/tests/audit.offline-photo.spec.ts (real browser IndexedDB; jsdom has none).

function rec(over: Partial<OutboxRecord>): OutboxRecord {
  return {
    id: over.id ?? 'r1', auditId: 'a1', sectionId: 's1', filename: 'f.jpg',
    contentType: 'image/jpeg', blob: new Blob(), uploadedBy: 'u1',
    createdAt: 0, status: 'pending', attempts: 0, nextAttemptAt: 0, ...over,
  }
}

describe('backoffMs', () => {
  it('grows exponentially from 5s', () => {
    expect(backoffMs(0)).toBe(5000)
    expect(backoffMs(1)).toBe(10000)
    expect(backoffMs(2)).toBe(20000)
    expect(backoffMs(3)).toBe(40000)
  })
  it('caps at 5 minutes', () => {
    expect(backoffMs(10)).toBe(5 * 60_000)
    expect(backoffMs(100)).toBe(5 * 60_000)
  })
})

describe('isPermanentError', () => {
  it('treats a foreign-key violation (23503) as permanent — the audit is gone', () => {
    expect(isPermanentError({ code: '23503' }, 1)).toBe(true)
  })
  it('treats exhausted attempts as permanent regardless of error', () => {
    expect(isPermanentError(new Error('network'), 6)).toBe(true)
    expect(isPermanentError(undefined, 6)).toBe(true)
  })
  it('treats a transient error under the attempt cap as retryable', () => {
    expect(isPermanentError(new Error('offline'), 1)).toBe(false)
    expect(isPermanentError({ code: '500' }, 3)).toBe(false)
  })
})

describe('filterRenderablePending', () => {
  it('hides an uploaded record once its server row is confirmed (flicker-free swap)', () => {
    const uploaded = rec({ id: 'u', status: 'uploaded', serverId: 'srv-1' })
    const out = filterRenderablePending([uploaded], new Set(['srv-1']))
    expect(out).toHaveLength(0)
  })
  it('keeps an uploaded record until the server row appears', () => {
    const uploaded = rec({ id: 'u', status: 'uploaded', serverId: 'srv-2' })
    expect(filterRenderablePending([uploaded], new Set(['other']))).toEqual([uploaded])
  })
  it('always keeps pending, uploading, and failed records', () => {
    const items = [
      rec({ id: 'p', status: 'pending' }),
      rec({ id: 'g', status: 'uploading' }),
      rec({ id: 'f', status: 'failed' }),
    ]
    expect(filterRenderablePending(items, new Set(['p', 'g', 'f']))).toEqual(items)
  })
})

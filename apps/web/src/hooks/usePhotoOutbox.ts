import { useEffect, useSyncExternalStore } from 'react'
import { ensureLoaded, evictSection, getSnapshot, subscribe, type OutboxRecord } from '../utils/photoOutbox'

const EMPTY: OutboxRecord[] = []

/**
 * Reactive view of the offline photo outbox for one audit section. Returns the
 * queued (pending/uploading/uploaded/failed) records, referentially stable so
 * React re-renders only when this section's queue actually changes. On unmount /
 * section change it evicts the section's snapshot and revokes its object URLs
 * (the durable IndexedDB records are untouched and reload on return).
 */
export function usePhotoOutbox(auditId?: string, sectionId?: string): OutboxRecord[] {
  useEffect(() => {
    if (!auditId || !sectionId) return
    ensureLoaded(auditId, sectionId)
    return () => evictSection(auditId, sectionId)
  }, [auditId, sectionId])

  return useSyncExternalStore(
    subscribe,
    () => (auditId && sectionId ? getSnapshot(auditId, sectionId) : EMPTY),
  )
}

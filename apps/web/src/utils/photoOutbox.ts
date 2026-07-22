/**
 * Offline photo-capture outbox.
 *
 * A section photo captured while offline used to be lost: onFilesSelected called
 * addSectionPhoto immediately and the failed upload threw. Now the compressed blob
 * is persisted to IndexedDB on capture (durable across reloads/crashes) and replayed
 * when the device reconnects. Replay is EXACTLY-ONCE: a deterministic object path
 * keyed on the record id plus a UNIQUE index on audit_photos.url (the DB is the
 * arbiter — see supabaseApi.addSectionPhoto's clientId param) means a double-flush,
 * a concurrent multi-tab flush, or a crash between the server insert and the local
 * status write can never produce a duplicate audit_photos row.
 *
 * Constraints honored: raw IndexedDB only (no new deps); blobs live ONLY in IDB,
 * never in localStorage or the JSON-persisted React Query cache; evidence stays
 * section-level. A record leaves the store only after the server row is confirmed
 * (purgeConfirmed) or the user explicitly discards it — never silent loss.
 */
import { logger } from './logger'

export type OutboxStatus = 'pending' | 'uploading' | 'uploaded' | 'failed'

export interface OutboxRecord {
  id: string
  auditId: string
  sectionId: string
  filename: string
  contentType: string
  blob: Blob
  uploadedBy: string
  createdAt: number
  status: OutboxStatus
  attempts: number
  nextAttemptAt: number
  lastError?: string
  serverId?: string
}

export interface FlushDeps {
  addSectionPhoto: (
    auditId: string,
    sectionId: string,
    payload: { filename: string; url: string; uploadedBy: string },
    clientId?: string,
  ) => Promise<{ id: string }>
  onFlushed: (auditId: string) => void
}

const DB_NAME = 'trakr-photo-outbox'
const STORE = 'photos'
const MAX_ATTEMPTS = 6
const MAX_BACKOFF_MS = 5 * 60_000

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested without IndexedDB)
// ---------------------------------------------------------------------------

/** Exponential backoff, capped. Jitter is added by the caller. */
export function backoffMs(attempts: number): number {
  return Math.min(MAX_BACKOFF_MS, 5000 * 2 ** attempts)
}

/** A permanent failure is not worth auto-retrying: a bad FK (audit deleted while
 *  offline, or invalid uploadedBy) or too many attempts. Everything else is transient. */
export function isPermanentError(err: unknown, attempts: number): boolean {
  if (attempts >= MAX_ATTEMPTS) return true
  const code = (err as { code?: string })?.code
  return code === '23503' // foreign_key_violation
}

/** Pending records to render, excluding ones already confirmed as a server row
 *  (so the blob tile swaps to the signed-path tile without a disappear/reappear gap). */
export function filterRenderablePending(pending: OutboxRecord[], serverIds: Set<string>): OutboxRecord[] {
  return pending.filter((r) => !(r.status === 'uploaded' && r.serverId && serverIds.has(r.serverId)))
}

// ---------------------------------------------------------------------------
// IndexedDB plumbing (lazy — importing this module never opens the DB)
// ---------------------------------------------------------------------------

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    let req: IDBOpenDBRequest
    try {
      req = indexedDB.open(DB_NAME, 1)
    } catch (e) {
      dbPromise = null // don't cache a hard failure — let the next call retry
      reject(e)
      return
    }
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    // A cached REJECTED promise would disable the outbox forever after one
    // transient open failure — null the memo so the next call reopens.
    req.onerror = () => { dbPromise = null; reject(req.error) }
    req.onblocked = () => { dbPromise = null; reject(req.error ?? new Error('IndexedDB open blocked')) }
  })
  return dbPromise
}

/** Reads resolve on request success; WRITES resolve on transaction COMMIT (a
 *  commit-time abort — e.g. quota exceeded — must reject, not silently "succeed"). */
function reqToPromise<T>(makeReq: (store: IDBObjectStore) => IDBRequest<T>, mode: IDBTransactionMode): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const req = makeReq(tx.objectStore(STORE))
        if (mode === 'readonly') {
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => reject(req.error)
          return
        }
        let result: T
        req.onsuccess = () => { result = req.result }
        req.onerror = () => reject(req.error)
        tx.oncomplete = () => resolve(result)
        tx.onabort = () => reject(tx.error ?? req.error ?? new Error('IndexedDB write aborted'))
        tx.onerror = () => reject(tx.error ?? req.error ?? new Error('IndexedDB write failed'))
      }),
  )
}

const idbGetAll = () => reqToPromise<OutboxRecord[]>((s) => s.getAll() as IDBRequest<OutboxRecord[]>, 'readonly')
const idbGet = (id: string) => reqToPromise<OutboxRecord | undefined>((s) => s.get(id) as IDBRequest<OutboxRecord | undefined>, 'readonly')
const idbPut = (rec: OutboxRecord) => reqToPromise<IDBValidKey>((s) => s.put(rec), 'readwrite')
const idbDelete = (id: string) => reqToPromise<undefined>((s) => s.delete(id) as IDBRequest<undefined>, 'readwrite')

// ---------------------------------------------------------------------------
// Reactive snapshot cache (drives useSyncExternalStore)
// ---------------------------------------------------------------------------

const listeners = new Set<() => void>()
const cache = new Map<string, OutboxRecord[]>() // `${auditId}|${sectionId}` -> stable array
const objectUrls = new Map<string, string>() // record id -> blob: URL
const EMPTY: OutboxRecord[] = Object.freeze([]) as unknown as OutboxRecord[]

const keyOf = (auditId: string, sectionId: string) => `${auditId}|${sectionId}`

function notify() {
  listeners.forEach((l) => l())
}

async function refresh(auditId: string, sectionId: string) {
  const all = await idbGetAll()
  const rows = all
    .filter((r) => r.auditId === auditId && r.sectionId === sectionId)
    .sort((a, b) => a.createdAt - b.createdAt)
  cache.set(keyOf(auditId, sectionId), rows)
  notify()
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Synchronous, referentially-stable snapshot for useSyncExternalStore. */
export function getSnapshot(auditId: string, sectionId: string): OutboxRecord[] {
  return cache.get(keyOf(auditId, sectionId)) ?? EMPTY
}

/** Load a section's records into the snapshot cache (call once on mount). */
export function ensureLoaded(auditId: string, sectionId: string): void {
  if (cache.has(keyOf(auditId, sectionId))) return
  cache.set(keyOf(auditId, sectionId), EMPTY) // seed so a re-entrant mount doesn't reload
  refresh(auditId, sectionId).catch((e) => logger.warn('outbox load failed', { context: 'photoOutbox', data: e }))
}

/** Drop a section's snapshot + revoke its object URLs when it leaves the screen
 *  (unmount / section change). The durable IDB records are untouched — ensureLoaded
 *  reloads and getObjectUrl re-mints on return. Prevents an objectURL/Blob leak. */
export function evictSection(auditId: string, sectionId: string): void {
  const key = keyOf(auditId, sectionId)
  const rows = cache.get(key)
  // Don't revoke a URL an in-flight flush may be fetching right now; that record's
  // URL is released later by purgeConfirmed (uploaded) or a subsequent evict.
  if (rows) rows.forEach((r) => { if (r.status !== 'uploading') releaseObjectUrl(r.id) })
  cache.delete(key)
}

export function getObjectUrl(rec: OutboxRecord): string {
  let url = objectUrls.get(rec.id)
  if (!url) {
    url = URL.createObjectURL(rec.blob)
    objectUrls.set(rec.id, url)
  }
  return url
}

export function releaseObjectUrl(id: string): void {
  const url = objectUrls.get(id)
  if (url) {
    URL.revokeObjectURL(url)
    objectUrls.delete(id)
  }
}

// Best-effort, once-per-session: ask the browser to keep this storage
// non-evictable so queued photos survive memory pressure.
let persistChecked = false
async function ensurePersistentStorage(): Promise<void> {
  if (persistChecked) return
  persistChecked = true
  try {
    const s = navigator.storage
    if (s?.persist && (!s.persisted || !(await s.persisted()))) await s.persist()
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function enqueuePhoto(input: {
  auditId: string
  sectionId: string
  filename: string
  contentType: string
  blob: Blob
  uploadedBy: string
}): Promise<OutboxRecord> {
  const rec: OutboxRecord = {
    id: crypto.randomUUID(),
    ...input,
    createdAt: Date.now(),
    status: 'pending',
    attempts: 0,
    nextAttemptAt: 0,
  }
  await idbPut(rec) // resolves on COMMIT — rejects on a quota abort, so the caller isn't told a lost photo is saved
  void ensurePersistentStorage()
  await refresh(input.auditId, input.sectionId)
  return rec
}

async function patch(id: string, fields: Partial<OutboxRecord>): Promise<OutboxRecord | undefined> {
  const rec = await idbGet(id)
  if (!rec) return undefined
  const next = { ...rec, ...fields }
  await idbPut(next)
  await refresh(next.auditId, next.sectionId)
  return next
}

export async function removeOutboxPhoto(id: string): Promise<void> {
  const rec = await idbGet(id)
  await idbDelete(id)
  releaseObjectUrl(id)
  if (rec) await refresh(rec.auditId, rec.sectionId)
}

export async function retryPhoto(id: string, deps: FlushDeps): Promise<void> {
  await patch(id, { status: 'pending', attempts: 0, nextAttemptAt: 0, lastError: undefined })
  void flushOutbox(deps)
}

/** Drop uploaded records whose server row is now present in the refetched audit. */
export async function purgeConfirmed(auditId: string, confirmedServerIds: Set<string>): Promise<void> {
  const all = await idbGetAll()
  const done = all.filter((r) => r.auditId === auditId && r.status === 'uploaded' && r.serverId && confirmedServerIds.has(r.serverId))
  if (!done.length) return
  for (const r of done) {
    await idbDelete(r.id)
    releaseObjectUrl(r.id)
  }
  const sections = new Set(done.map((r) => r.sectionId))
  for (const s of sections) await refresh(auditId, s)
}

// ---------------------------------------------------------------------------
// Flush (single-flight, serial)
// ---------------------------------------------------------------------------

let flushing = false
let rerun = false

export async function flushOutbox(deps: FlushDeps): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return
  if (flushing) { rerun = true; return }
  flushing = true
  try {
    let all = await idbGetAll()
    // Reclaim records stranded 'uploading' by a prior crash/reload/tab-kill:
    // flushOutbox is single-flight, so within this realm nothing is genuinely
    // in-flight now, and replay is exactly-once (deterministic path + unique
    // url), so re-driving an already-inserted record is a safe dedup no-op.
    const stale = all.filter((r) => r.status === 'uploading')
    if (stale.length) {
      for (const r of stale) await patch(r.id, { status: 'pending' })
      all = await idbGetAll()
    }
    const due = all
      .filter((r) => r.status === 'pending' && r.nextAttemptAt <= Date.now())
      .sort((a, b) => a.createdAt - b.createdAt)
    for (const rec of due) {
      await patch(rec.id, { status: 'uploading' }) // a racing trigger skips in-flight items
      try {
        const res = await deps.addSectionPhoto(
          rec.auditId,
          rec.sectionId,
          { filename: rec.filename, url: getObjectUrl(rec), uploadedBy: rec.uploadedBy },
          rec.id,
        )
        await patch(rec.id, { status: 'uploaded', serverId: res.id })
        deps.onFlushed(rec.auditId)
      } catch (err) {
        const attempts = rec.attempts + 1
        const message = err instanceof Error ? err.message : String(err)
        if (isPermanentError(err, attempts)) {
          await patch(rec.id, { status: 'failed', attempts, lastError: message })
        } else {
          await patch(rec.id, {
            status: 'pending',
            attempts,
            lastError: message,
            nextAttemptAt: Date.now() + backoffMs(attempts) + Math.floor(Math.random() * 1000),
          })
        }
      }
    }
  } finally {
    flushing = false
    if (rerun) { rerun = false; return flushOutbox(deps) }
  }
}

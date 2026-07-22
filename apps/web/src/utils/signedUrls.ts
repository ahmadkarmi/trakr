/**
 * Signed-URL resolver for private Supabase Storage buckets.
 *
 * The audit-photos bucket is private (org-scoped RLS on storage.objects), so
 * objects are no longer reachable by a public URL — the app stores the object
 * PATH and mints a short-lived signed URL on demand. Signing happens at DISPLAY
 * time (not at fetch time) on purpose: this app persists the entire React Query
 * cache to localStorage with staleTime: Infinity, so a signed URL cached in a
 * query would be written to disk and 404 after it expires. The in-memory cache
 * below is never persisted and is keyed by bucket+path with its own TTL.
 *
 * Values that are already resolvable (data:, blob:, http[s]:) pass through
 * untouched — e.g. drawn approval signatures are inline data: URLs, and any
 * legacy absolute URL keeps working.
 */
import { useEffect, useState } from 'react'
import { getSupabase } from './supabaseClient'

const TTL_SEC = 3600 // 1h — comfortably longer than a working session/PDF export
const SKEW_MS = 60_000 // re-sign a minute early so an in-flight render never uses a just-expired URL

type CacheEntry = { url: string; exp: number }
const cache = new Map<string, CacheEntry>()

function isResolved(v: string): boolean {
  return (
    v.startsWith('data:') ||
    v.startsWith('blob:') ||
    v.startsWith('http://') ||
    v.startsWith('https://')
  )
}

/**
 * Resolve a stored value to a usable image URL. Returns '' when a bare path
 * cannot be signed (caller renders a fallback). Pass-through values are
 * returned as-is.
 */
export async function resolveSignedUrl(
  bucket: string,
  pathOrUrl?: string | null,
  ttlSec = TTL_SEC,
): Promise<string> {
  if (!pathOrUrl) return ''
  if (isResolved(pathOrUrl)) return pathOrUrl

  const key = `${bucket}:${pathOrUrl}`
  const now = Date.now()
  const hit = cache.get(key)
  if (hit && hit.exp > now + SKEW_MS) return hit.url

  const supabase = await getSupabase()
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(pathOrUrl, ttlSec)
  if (error || !data?.signedUrl) return ''
  cache.set(key, { url: data.signedUrl, exp: now + ttlSec * 1000 })
  return data.signedUrl
}

/**
 * React hook: resolve a stored path/URL to a display URL. Pass-through values
 * are returned synchronously on first render (no flash); bare paths resolve
 * asynchronously and update state once signed.
 */
export function useSignedUrl(bucket: string, pathOrUrl?: string | null): string | undefined {
  const [url, setUrl] = useState<string | undefined>(() =>
    pathOrUrl && isResolved(pathOrUrl) ? pathOrUrl : undefined,
  )

  useEffect(() => {
    let active = true
    if (!pathOrUrl) {
      setUrl(undefined)
      return
    }
    if (isResolved(pathOrUrl)) {
      setUrl(pathOrUrl)
      return
    }
    resolveSignedUrl(bucket, pathOrUrl).then((u) => {
      if (active) setUrl(u || undefined)
    })
    return () => {
      active = false
    }
  }, [bucket, pathOrUrl])

  return url
}

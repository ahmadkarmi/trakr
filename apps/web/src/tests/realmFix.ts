// Realm fix for vitest's jsdom environment. jsdom ships no fetch, so Node's
// native undici fetch stays global — but jsdom shadows AbortController,
// AbortSignal, Blob, File, and FormData with its own realm's classes, and
// undici only honors its own realm:
// - Undici v7 (Node >=24) brand-checks RequestInit.signal, so circuitBreaker's
//   `new AbortController()` passed into fetch throws.
// - storage-js wraps Blob bodies in `new FormData()`; a jsdom FormData isn't
//   recognized by undici as multipart and gets string-coerced, so uploads
//   arrive as text/plain and the buckets' MIME allow-list rejects them.
// Restore Node natives so the whole fetch stack lives in one realm. This
// module must be the FIRST import of setupTests so the swaps happen before
// any app/supabase module evaluates. Safe while no DOM addEventListener uses
// { signal } (currently zero call sites); if one appears, bridge signals
// inside a fetch wrapper here instead.
import { transferableAbortController } from 'node:util'
import { Blob as NodeBlob, File as NodeFile } from 'node:buffer'

const nativeController = transferableAbortController()
globalThis.AbortController = nativeController.constructor as typeof AbortController
globalThis.AbortSignal = (nativeController.signal.constructor as unknown) as typeof AbortSignal
globalThis.Blob = NodeBlob as unknown as typeof Blob
globalThis.File = NodeFile as unknown as typeof File

// jsdom has no Response either, so this is Node's — its .formData() yields a
// native undici FormData, the only way back to that class once shadowed.
const nativeFormData = await new Response('a=b', {
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
}).formData()
globalThis.FormData = nativeFormData.constructor as typeof FormData

export {}
